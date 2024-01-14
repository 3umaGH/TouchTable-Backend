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
import {
  mockCategories,
  mockCategories1,
  mockDishes,
  mockDishes1,
  mockTables,
} from "./mockData";
import { v4 as uuidv4 } from "uuid";
import { detectOrderItemUpdate, getDishByID, validateOrder } from "./util";
import { Server } from "socket.io";
import { Restaurant } from "./classes/Restaurant";

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
    origin: "*",
  },
});

const restaurant = new Restaurant(0, "Name", "", mockDishes, mockCategories, 5);
const restaurant2 = new Restaurant(
  1,
  "Name",
  "",
  mockDishes1,
  mockCategories1,
  5
);

export const restaurants = new Map();

restaurants.set(0, restaurant);
restaurants.set(1, restaurant2);

io.listen(3001);

const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

io.on("connection", (socket) => {
  socket.on("joinRoom", (restaurantID, room, callback) => {
    try {
      const restaurant = restaurants.get(restaurantID) as Restaurant;
      if (!restaurant) throw new Error("Invalid restaurant ID");

      socket.join(`${restaurantID}_${room}`);
      callback(true);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
      else callback({ error: true, message: "Unknown Error" });
    }
  });

  socket.on("getRestaurantNotifications", (restaurantID, callback) => {
    try {
      const restaurant = restaurants.get(restaurantID) as Restaurant;
      if (!restaurant) throw new Error("Invalid restaurant ID");

      callback(restaurant.notifications);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
      else callback({ error: true, message: "Unknown Error" });
    }
  });

  socket.on("setNotificationInactive", (restaurantID, id, callback) => {
    try {
      const restaurant = restaurants.get(restaurantID) as Restaurant;
      if (!restaurant) throw new Error("Invalid restaurant ID");

      const notification = restaurant.notifications.find(
        (notif) => notif.id === id
      );

      if (!notification) throw new Error("Notification could not be found");

      notification.active = false;
      callback(notification);

      io.to(`${restaurantID}_waiters`).emit(
        "notificationStatusUpdate",
        notification
      );
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
      else callback({ error: true, message: "Unknown Error" });
    }
  });

  socket.on("getRestaurantOrders", (restaurantID, callback) => {
    try {
      const restaurant = restaurants.get(restaurantID) as Restaurant;
      if (!restaurant) throw new Error("Invalid restaurant ID");

      callback(restaurant.orders);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
      else callback({ error: true, message: "Unknown Error" });
    }
  });

  socket.on("updateOrder", (restaurantID, id, newOrder, callback) => {
    try {
      const restaurant = restaurants.get(restaurantID) as Restaurant;
      if (!restaurant) throw new Error("Invalid restaurant ID");

      const prevOrderIndex = restaurant.orders.findIndex(
        (order) => order.id === newOrder.id
      );

      if (prevOrderIndex === -1)
        throw new Error(`Order ${newOrder.id} does not exist.`);

      const prevOrder = restaurant.orders[prevOrderIndex];

      validateOrder(restaurantID, newOrder);

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
        const originTable = restaurant.tables.find(
          (table) => table.id === prevOrder.origin
        );

        if (!originTable) throw new Error("Unable to find origin table");

        originTable.activeOrders = originTable.activeOrders.filter(
          (id) => id !== newOrder.id
        );

        // Set notifications inactive that are associated with that table.
        restaurant.notifications = restaurant.notifications.map(
          (notification) => {
            if (notification.origin === prevOrder.origin) {
              const newNotification = { ...notification, active: false };

              io.to(`${restaurantID}_waiters`)
                .to(`${restaurantID}_kitchen`)
                .to(`${restaurantID}_table_${newOrder.origin}`)
                .emit("notificationStatusUpdate", newNotification);

              return notification;
            }
            return notification;
          }
        );

        io.to(`${restaurantID}_table_${newOrder.origin}`).emit(
          "tableSessionClear"
        );
      }

      const updatedOrder = {
        ...newOrder,
        id: prevOrder.id,
        time: prevOrder.time,
        origin: prevOrder.origin,
        status: newStatus,
      };

      restaurant.orders = [
        ...restaurant.orders.slice(0, prevOrderIndex),
        updatedOrder,
        ...restaurant.orders.slice(prevOrderIndex + 1),
      ];

      detectOrderItemUpdate(newOrder, prevOrder).forEach((update) => {
        if (!update) return;
        if (newOrder.id === null) return;

        const dish = getDishByID(restaurantID, update.item.dish.dishID);

        console.log(update?.type, dish)
        switch (update?.type) {
          case "IsPrepared": {
            sendNotification(
              restaurantID,
              newOrder.origin,
              "READY_FOR_DELIVERY",
              {
                orderID: [newOrder.id],
                orderItemID: update.item.id,
              }
            );
            break;
          }

          case "IsCancelled": {
            sendNotification(
              restaurantID,
              newOrder.origin,
              "ORDER_ITEM_CANCELLED",
              {
                orderID: [newOrder.id],
                orderItemID: update.item.id,
              }
            );
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

      callback(updatedOrder);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
      else callback({ error: true, message: "Unknown Error" });
    }
  });

  socket.on("createOrder", (restaurantID, order, callback) => {
    try {
      const restaurant = restaurants.get(restaurantID) as Restaurant;
      if (!restaurant) throw new Error("Invalid restaurant ID");

      const table = restaurant.tables.find(
        (table) => table.id === order.origin
      );

      if (order.items.length === 0)
        throw new Error("Cannot accept an empty order.");

      if (!(order.origin < restaurant.tables.length))
        throw new Error(
          `Table ID ${order.origin} does not exist. Did you check if the TableID is correct?`
        );

      if (!table)
        throw new Error(
          `Unable to assign order sent from table #${order.origin} to a table. Table is not found.`
        );

      /* Prevent user from adding new items, while he is waiting for the check*/
      const existingRequest = restaurant.notifications.find(
        (notification) =>
          notification.origin === order.origin &&
          notification.type === "CHECK_REQUESTED" &&
          notification.active
      );

      if (existingRequest) {
        throw new Error(`Unable to add a new order, payment is in progress.`);
      }

      validateOrder(restaurantID, order);

      order.id =
        restaurant.orders.reduce(
          (maxId, order) => Math.max(order.id ?? 0, maxId),
          -1
        ) + 1;
      order.time = Date.now();
      order.status = "ORDER_RECEIVED";
      order.items = order.items.map((orderItem) => ({
        ...orderItem,
        id: uuidv4(),
      }));

      table.activeOrders = [...table.activeOrders, order.id];
      restaurant.orders.push(order);

      sendNotification(restaurantID, order.origin, "NEW_ORDER", {
        orderID: [order.id],
      });

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
      const restaurant = restaurants.get(restaurantID) as Restaurant;
      if (!restaurant) throw new Error("Invalid restaurant ID");

      const table = { ...restaurant.tables[tableID] };

      if (isNaN(tableID)) throw new Error(`TableID is not a number.`);

      if (!table)
        throw new Error(`Table with ID ${tableID} could not be found.`);

      const updatedTable = {
        ...table,
        orders: table.activeOrders
          .map((orderId) => {
            const matchingOrder = restaurant.orders.find(
              (fullOrder) => fullOrder.id === orderId
            );
            return matchingOrder;
          })
          .filter((order) => order !== undefined) as Order[],
      };

      callback(updatedTable.orders);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
      else callback({ error: true, message: "Unknown Error" });
    }
  });

  socket.on("getRestaurantData", (restaurantID, callback) => {
    try {
      const restaurant = restaurants.get(restaurantID) as Restaurant;
      if (!restaurant) throw new Error("Invalid restaurant ID");

      callback({
        dishes: restaurant.dishes,
        categories: restaurant.categories,
      });
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
      else callback({ error: true, message: "Unknown Error" });
    }
  });

  socket.on("createAssistanceRequest", (restaurantID, tableID, callback) => {
    try {
      const restaurant = restaurants.get(restaurantID) as Restaurant;
      if (!restaurant) throw new Error("Invalid restaurant ID");

      if (!(tableID < restaurant.tables.length))
        throw new Error("Invalid origin");

      const existingRequest = restaurant.notifications.find(
        (notification) =>
          notification.origin === tableID &&
          notification.type === "NEED_ASSISTANCE" &&
          notification.active
      );

      if (existingRequest) throw new Error("Request is already pending");

      sendNotification(restaurantID, tableID, "NEED_ASSISTANCE");

      callback(true);
    } catch (err) {
      if (err instanceof Error) callback({ error: true, message: err.message });
      else callback({ error: true, message: "Unknown Error" });
    }
  });

  socket.on(
    "createCheckRequest",
    (restaurantID, tableID, paymentBy, callback) => {
      try {
        const restaurant = restaurants.get(restaurantID) as Restaurant;
        if (!restaurant) throw new Error("Invalid restaurant ID");

        if (!(tableID < restaurant.tables.length))
          throw new Error("Invalid origin");

        const existingRequest = restaurant.notifications.find(
          (notification) =>
            notification.origin === tableID &&
            notification.type === "CHECK_REQUESTED" &&
            notification.active
        );

        if (existingRequest) throw new Error("Request is already pending");

        sendNotification(restaurantID, tableID, "CHECK_REQUESTED", {
          orderID: restaurant.orders
            .filter((order) => order.status !== "FINISHED")
            .filter(
              (order) => order.origin !== null && order.origin === tableID
            )
            .map((order) => order.id as number),
          paymentBy: paymentBy,
        });

        return callback(true);
      } catch (err) {
        if (err instanceof Error)
          callback({ error: true, message: err.message });
        else callback({ error: true, message: "Unknown Error" });
      }
    }
  );

  socket.on("disconnect", (socket) => {
    console.log("disconnect", socket);
  });
});

const sendNotification = (
  restaurantID: number,
  origin: number,
  type: NotificationType,
  extraData?: {
    orderItemID?: string;
    orderID?: number[];
    paymentBy?: "cash" | "card";
  }
) => {
  try {
    const restaurant = restaurants.get(restaurantID) as Restaurant;
    if (!restaurant) throw new Error("Invalid restaurant ID");

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

    if (extraData?.paymentBy !== undefined)
      notification.extraData.paymentBy = extraData.paymentBy;

    restaurant.notifications.push(notification);

    io.to(`${restaurantID}_waiters`).emit("newNotification", notification);

    console.log(notification);
  } catch (err) {
    console.log(err);
  }
};

app.use(cors());
app.use(express.json());

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
