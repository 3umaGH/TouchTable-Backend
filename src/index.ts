import express, { Express, Request, Response } from "express";
import {
  Notification,
  NotificationActor,
  NotificationType,
  Order,
  OrderItemStatuses,
  OrderStatus,
  OrderStatuses,
  Table,
} from "./types/globalTypes";
import { mockCategories, mockDishes, mockTables } from "./mockData";
import { v4 as uuidv4 } from "uuid";
import { detectOrderItemUpdate, getDishByID, validateOrder } from "./util";

const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

const tables: Table[] = mockTables;
const tableIds = tables.map((table) => table.id);

export const dishes = mockDishes;

let activeOrders: Order[] = [];

const notifications = new Map<NotificationActor, Notification[]>();

const sendNotification = (
  recipient: NotificationActor,
  origin: NotificationActor,
  type: NotificationType,
  message: string
) => {
  const notification: Notification = {
    id: uuidv4(),
    time: Date.now(),
    origin: origin,
    recipient: recipient,
    type: type,
    active: true,
    message: message,
  };

  if (notifications.has(recipient))
    notifications.get(recipient)?.push(notification);
  else notifications.set(recipient, [notification]);

  /*console.log("new notif:", notification);*/
};

app.use(cors());
app.use(express.json());

app.post("/order", (req: Request, res: Response) => {
  try {
    const order = req.body as Order;
    const table = tables.find((table) => table.id === order.origin);

    if (order.items.length === 0)
      return res
        .status(400)
        .send({ message: "ERROR: Cannot accept an empty order." });

    if (!tableIds.includes(order.origin))
      return res.status(400).send({
        message: `ERROR: Table ID ${order.origin} does not exist. Did you check if the TableID is correct?`,
      });

    if (!table)
      return res.status(500).send({
        message: `ERROR: Unable to assign order sent from table #${order.origin} to a table. Table is not found.`,
      });

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

    return res.status(200).send(order);
  } catch (err) {
    return res.status(500).send({ message: "Internal Error: " + err });
  }
});

app.put("/order", (req, res) => {
  try {
    const newOrder = req.body as Order;
    const prevOrderIndex = activeOrders.findIndex(
      (order) => order.id === newOrder.id
    );

    if (prevOrderIndex === -1) {
      return res.status(400).send({
        message: `ERROR: Order ${newOrder.id} does not exist.`,
      });
    }

    const prevOrder = activeOrders[prevOrderIndex];

    validateOrder(newOrder);

    const itemStatuses = newOrder.items.map((item) => item.status);

    let newStatus: OrderStatus;

    /*TODO: Fix this crap*/
    if (itemStatuses.every((status) => status === "CANCELLED")) {
      newStatus = "CANCELLED";
    } else if (
      itemStatuses.includes("DELIVERED") ||
      (itemStatuses.includes("DELIVERED") && itemStatuses.includes("CANCELLED"))
    ) {
      newStatus = "DELIVERED";
    } else if (
      itemStatuses.includes("IN_PROGRESS") ||
      (itemStatuses.includes("IN_PROGRESS") &&
        itemStatuses.includes("CANCELLED"))
    ) {
      newStatus = "IN_PROGRESS";
    } else {
      newStatus = "IN_PROGRESS";
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

      const dish = getDishByID(update.item.dish.dishID);
      switch (update?.type) {
        case "IsPrepared": {
          sendNotification(
            "WAITERS",
            "KITCHEN",
            "READY_FOR_DELIVERY",
            `${update.item.amount}x ${dish?.params.title} is ready to be delivered to Table #${newOrder.origin}`
          );
          break;
        }

        case "IsCancelled": {
          sendNotification(
            "WAITERS",
            "KITCHEN",
            "ORDER_ITEM_CANCELLED",
            `${update.item.amount}x ${dish?.params.title} is cancelled by kitchen, please notify Table #${newOrder.origin}`
          );
          break;
        }

        case "IsPreparing": {
          sendNotification(
            "WAITERS",
            "KITCHEN",
            "PREPARATION_STARTED",
            `${update.item.amount}x ${dish?.params.title} for Table #${newOrder.origin} is now preparing.`
          );
          break;
        }
        default: 
        break;
      }
    });

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: "Internal Error: " + err });
  }
});

app.get("/table/:tableID", (req: Request, res: Response) => {
  try {
    const tableID = parseFloat(req.params.tableID);
    const table = { ...tables[tableID] };

    if (isNaN(tableID))
      return res.status(400).send({
        message: `ERROR: TableID is not a number.`,
      });

    if (!table)
      return res.status(500).send({
        message: `ERROR: Table with ID ${tableID} could not be found.`,
      });

    const updatedTable = {
      ...table,
      activeOrders: table.activeOrders.map((orderId) => {
        const matchingOrder = activeOrders.find(
          (fullOrder) => fullOrder.id === orderId
        );
        return matchingOrder || orderId;
      }),
    };

    return res.status(200).send(updatedTable);
  } catch (err) {
    return res.status(500).send({ message: "Internal Error" });
  }
});

app.get("/get-dish-data", (req: Request, res: Response) => {
  return res
    .status(200)
    .send({ dishes: mockDishes, categories: mockCategories });
});

app.get("/tables", (req: Request, res: Response) => {
  return res.status(200).send({ tables: tables });
});

app.get("/orders", (req: Request, res: Response) => {
  return res.status(200).send({ activeOrders: activeOrders });
});

app.get("/notifications", (req: Request, res: Response) => {
  console.log(notifications);
  return res.status(200).send(Array.from(notifications.values()));
});

/* TODO: Flood protection */
app.post("/assistance", (req: Request, res: Response) => {
  try {
    const data = req.body as { origin: number };

    if (!tableIds.includes(data.origin)) throw new Error("Invalid origin");

    sendNotification(
      "WAITERS",
      data.origin,
      "NEED_ASSISTANCE",
      `Table #${data.origin} is requesting assistance.`
    );

    return res.status(200).send(true);
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: "Internal Error: " + err });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
