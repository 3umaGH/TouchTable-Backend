import express, { Express, Request, Response } from "express";
import {
  Order,
  OrderItemStatuses,
  OrderStatuses,
  Table,
} from "./types/globalTypes";
import { mockCategories, mockDishes, mockTables } from "./mockData";
import { v4 as uuidv4 } from "uuid";

const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

const tables: Table[] = mockTables;
const tableIds = tables.map((table) => table.id);

let activeOrders: Order[] = [];
/*const activeOrderIds = activeOrders.map((order) => order.id);
const inactiveOrders: Order[] = [];*/

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

    order.id = activeOrders.length + 1;
    order.time = Date.now();
    order.status = "ORDER_RECEIVED";
    order.items = order.items.map((orderItem) => ({
      ...orderItem,
      id: uuidv4(),
    }));

    table.activeOrders = [...table.activeOrders, order.id];
    activeOrders.push(order);

    console.log("new order", order);

    return res.status(200).send(order);
  } catch (err) {
    return res.status(500).send({ message: "Internal Error" });
  }
});

app.put("/order", (req, res) => {
  try {
    const newOrder = req.body as Order;
    const prevOrderIndex = activeOrders.findIndex((order) => order.id === newOrder.id);

    if (prevOrderIndex === -1) {
      return res.status(400).send({
        message: `ERROR: Order ${newOrder.id} does not exist.`,
      });
    }

    const prevOrder = activeOrders[prevOrderIndex];

    const updatedOrder = {
      ...newOrder,
      id: prevOrder.id,
      time: prevOrder.time,
      origin: prevOrder.origin,
    };

    activeOrders = [
      ...activeOrders.slice(0, prevOrderIndex),
      updatedOrder,
      ...activeOrders.slice(prevOrderIndex + 1),
    ];

    console.log(updatedOrder);

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: "Internal Error" });
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
  return res.status(200).send({tables: tables});
});

app.get("/orders", (req: Request, res: Response) => {
  return res.status(200).send({activeOrders: activeOrders});
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
