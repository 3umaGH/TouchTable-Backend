import express, { Express, Request, Response } from "express";
import {
  Notification,
  NotificationType,
  Order,
  OrderItemStatuses,
  OrderStatus,
  OrderStatuses,
  Table,
} from "./types/restaurant";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
} from "./types/socket";
import { mockCategories, mockDishes, mockTables } from "./mockData";
import { v4 as uuidv4 } from "uuid";
import { detectOrderItemUpdate, getDishByID, validateOrder } from "./util";
import { Server } from "socket.io";

require("socket.io");

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents
>({
  connectionStateRecovery: {},
  pingTimeout: 7000,
  pingInterval: 3000,
  cors: {
    origin: "http://localhost:5173",
  },
});

io.listen(3001);

const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

const tables: Table[] = mockTables;
const tableIds = tables.map((table) => table.id);

export const dishes = mockDishes;

let activeOrders: Order[] = [];
let notifications: Notification[] = [];

const restaurantID = 0;

io.on("connection", (socket) => {
  console.log("new client", socket.id);

  socket.on("joinRoom", (restaurantID, room, callback) => {
    socket.join(`${restaurantID}_${room}`);
    callback(true);
  });

  socket.on("getRestaurantNotifications", (restaurantID, callback) => {
    callback(notifications);
  });

  socket.on("setNotificationInactive", (id, callback) => {
    const notification = notifications.find((notif) => notif.id === id);

    if (notification) {
      notification.active = false;
      callback(notification);

      io.to(`${restaurantID}_waiters`).emit(
        "notificationStatusUpdate",
        notification
      );
    } else
      callback({
        error: true,
        message: "Notification with this ID cannot be found",
      });
  });

  socket.on("getRestaurantOrders", (id, callback) => {
    callback(activeOrders);
  });

  socket.on("updateOrder", (restaurantID, id, newOrder, callback) => {
    try {
      const prevOrderIndex = activeOrders.findIndex(
        (order) => order.id === newOrder.id
      );

      if (prevOrderIndex === -1)
        throw new Error(`ERROR: Order ${newOrder.id} does not exist.`);

      const prevOrder = activeOrders[prevOrderIndex];

      validateOrder(newOrder);

      const itemStatuses = newOrder.items.map((item) => item.status);
      let newStatus: OrderStatus = newOrder.status;

      const contains = (status: OrderStatus) => {
        return itemStatuses.some((item) => item == status);
      };

      if (newOrder.status !== "CANCELLED" && newOrder.status !== "FINISHED") {
        if (itemStatuses.every((status) => status == "CANCELLED")) {
          newStatus = "CANCELLED";
        }

        if (contains("IN_PROGRESS")) {
          newStatus = "IN_PROGRESS";
        }

        if (
          contains("DELIVERED") &&
          !contains("IN_PROGRESS") &&
          !contains("ORDER_RECEIVED") &&
          !contains("INIT")
        ) {
          newStatus = "DELIVERED";
        }
      }

      if (newOrder.status === "FINISHED") {
        // Clean up table active orders
        const originTable = tables.find(
          (table) => table.id === prevOrder.origin
        );

        if (!originTable)
          throw new Error("Unable to find origin table to delete active order");

        originTable.activeOrders = originTable.activeOrders.filter(
          (id) => id !== newOrder.id
        );

        // Set notifications inactive that are associated with that table.
        notifications = notifications.map((notification) => {
          if (notification.origin === prevOrder.origin) {
            const newNotification = { ...notification, active: false };

            io.to(`${restaurantID}_waiters`)
              .to(`${restaurantID}_kitchen`)
              .to(`${restaurantID}_table_${newOrder.origin}`)
              .emit("notificationStatusUpdate", newNotification);

            return notification;
          }
          return notification;
        });
      }

      const updatedOrder = {
        ...newOrder,
        id: prevOrder.id,
        time: prevOrder.time,
        origin: prevOrder.origin,
        status: newStatus,
      };

      activeOrders = [
        ...activeOrders.slice(0, prevOrderIndex),
        updatedOrder,
        ...activeOrders.slice(prevOrderIndex + 1),
      ];

      detectOrderItemUpdate(newOrder, prevOrder).forEach((update) => {
        if (!update) return;
        if (!newOrder.id) return;

        const dish = getDishByID(update.item.dish.dishID);
        switch (update?.type) {
          case "IsPrepared": {
            sendNotification(newOrder.origin, "READY_FOR_DELIVERY", {
              orderID: [newOrder.id],
              orderItemID: update.item.id,
            });
            break;
          }

          case "IsCancelled": {
            sendNotification(newOrder.origin, "ORDER_ITEM_CANCELLED", {
              orderID: [newOrder.id],
              orderItemID: update.item.id,
            });
            break;
          }

          case "IsPreparing": {
            break;
          }

          default:
            break;
        }
      });

      io.to(`${restaurantID}_waiters`)
        .to(`${restaurantID}_kitchen`)
        .to(`${restaurantID}_table_${newOrder.origin}`)
        .emit("orderUpdate", updatedOrder);

        console.log(updatedOrder)

      callback(updatedOrder);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
    }
  });

  socket.on("createOrder", (restaurantID, order, callback) => {
    try {
      const table = tables.find((table) => table.id === order.origin);

      if (order.items.length === 0)
        throw new Error("ERROR: Cannot accept an empty order.");

      if (!tableIds.includes(order.origin))
        throw new Error(
          `ERROR: Table ID ${order.origin} does not exist. Did you check if the TableID is correct?`
        );

      if (!table)
        throw new Error(
          `ERROR: Unable to assign order sent from table #${order.origin} to a table. Table is not found.`
        );

      /* Prevent user from adding new items, while he is waiting for the check*/
      const existingRequest = notifications.find(
        (notification) =>
          notification.origin === order.origin &&
          notification.type === "CHECK_REQUESTED" &&
          notification.active
      );

      if (existingRequest) {
        throw new Error(
          `ERROR: Unable to add a new order, payment is in progress.`
        );
      }

      validateOrder(order);

      order.id = activeOrders.length + 1;
      order.time = Date.now();
      order.status = "ORDER_RECEIVED";
      order.items = order.items.map((orderItem) => ({
        ...orderItem,
        id: uuidv4(),
      }));

      table.activeOrders = [...table.activeOrders, order.id];
      activeOrders.push(order);

      sendNotification(order.origin, "NEW_ORDER", { orderID: [order.id] });

      io.to(`${restaurantID}_waiters`)
        .to(`${restaurantID}_kitchen`)
        .to(`${restaurantID}_table_${order.origin}`)
        .emit("newOrderCreated", order);

      callback(order);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
    }
  });

  socket.on("getTableOrders", (restaurantID, tableID, callback) => {
    try {
      const table = { ...tables[tableID] };

      if (isNaN(tableID)) throw new Error(`ERROR: TableID is not a number.`);

      if (!table)
        throw new Error(`ERROR: Table with ID ${tableID} could not be found.`);

      const updatedTable = {
        ...table,
        activeOrders: table.activeOrders
          .map((orderId) => {
            const matchingOrder = activeOrders.find(
              (fullOrder) => fullOrder.id === orderId
            );
            return matchingOrder;
          })
          .filter((order) => order !== undefined) as Order[],
      };

      callback(updatedTable.activeOrders);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
    }
  });

  socket.on("getRestaurantData", (id, callback) => {
    callback({ dishes: mockDishes, categories: mockCategories });
  });

  socket.on("createAssistanceRequest", (restaurantID, tableID, callback) => {
    try {
      if (!tableIds.includes(tableID)) throw new Error("Invalid origin");

      const existingRequest = notifications.find(
        (notification) =>
          notification.origin === tableID &&
          notification.type === "NEED_ASSISTANCE" &&
          notification.active
      );

      if (existingRequest) throw new Error("Request is already pending");

      sendNotification(tableID, "NEED_ASSISTANCE");

      callback(true);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
    }
  });

  socket.on(
    "createCheckRequest",
    (restaurantID, tableID, paymentBy, callback) => {
      try {
        if (!tableIds.includes(tableID)) throw new Error("Invalid origin");

        const existingRequest = notifications.find(
          (notification) =>
            notification.origin === tableID &&
            notification.type === "CHECK_REQUESTED" &&
            notification.active
        );

        if (existingRequest) throw new Error("Request is already pending");

        sendNotification(tableID, "CHECK_REQUESTED", {
          orderID: activeOrders
            .filter((order) => order.status !== "FINISHED")
            .filter(
              (order) => order.origin !== null && order.origin === tableID
            )
            .map((order) => order.id as number),
        });

        return callback(true);
      } catch (err) {
        if (err instanceof Error)
          callback({ error: true, message: err.message });
      }
    }
  );

  socket.on("disconnect", (socket) => {
    console.log("disconnect", socket);
  });
});

// Ping simulator
app.use((req, res, next) => {
  setTimeout(() => next(), 250);
});

const sendNotification = (
  origin: number,
  type: NotificationType,
  extraData?: { orderItemID?: string; orderID: number[] }
) => {
  const notification: Notification = {
    id: uuidv4(),
    time: Date.now(),
    origin: origin,
    type: type,
    active: true,

    extraData: {},
  };

  if (extraData?.orderItemID !== undefined)
    notification.extraData.orderItemID = extraData.orderItemID;

  if (extraData?.orderID !== undefined)
    notification.extraData.orderID = extraData.orderID;

  notifications.push(notification);

  io.to(`${restaurantID}_waiters`).emit("newNotification", notification);
};

app.use(cors());
app.use(express.json());

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
