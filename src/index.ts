import express, { Express, Request, Response } from "express";
import { Order, OrderStatuses, Table } from "./types/globalTypes";
import { mockTables } from "./mockData";
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

const tables: Table[] = mockTables;
const tableIds = tables.map((table) => table.id);

const activeOrders: Order[] = [];
/*const activeOrderIds = activeOrders.map((order) => order.id);
const inactiveOrders: Order[] = [];*/

app.use(cors());
app.use(express.json());

app.post("/test", (req: Request, res: Response) => {
  try {
    try {
      const order = req.body as Order;
      const table = tables.find((table) => table.id === order.origin);

      if (order.items.length === 0)
        return res
          .status(400)
          .send({ message: "ERROR: Cannot accept an empty order." });

      if (!tableIds.includes(order.origin))
        return res.status(400).send({
          message: `ERROR: Table ID ${order.origin} does not exist.\nDid you check if the TableID correct?`,
        });

      if (!table)
        return res.status(500).send({
          message: `ERROR: Unable to assign order sent from table #${order.origin} to a table. Table is not found.`,
        });

      order.id = activeOrders.length + 1;
      order.time = Date.now();
      order.status = "ORDER_SENT";

      /*order.items = order.items.map((orderItem) => ({...orderItem, status:"IN_PROGRESS"}))*/

      activeOrders.push(order);
      table.activeOrders = [...table.activeOrders, order.id];

      console.log("new order", order);

      return res.status(200).send(order);
    } catch (err) {
      return res.status(500).send({
        message: `ERROR: ${err}`,
      });
    }
  } catch (err) {
    return res.status(500).send({ message: "Internal Error" });
  }
});

app.get("/update-status/:orderID/:status", (req: Request, res: Response) => {
  try {
    const orderID = parseFloat(req.params.orderID);
    const newStatus = req.params.status as keyof typeof OrderStatuses;
    /*const origin = req.params.origin;*/

    if (isNaN(orderID))
      return res.status(400).send({
        message: `ERROR: OrderID Is not a number.`,
      });

    const order = activeOrders.find((order) => order.id === orderID);

    if (!order)
      return res.status(500).send({
        message: `ERROR: Order with ID ${orderID} could not be found.`,
      });

    if (!OrderStatuses.hasOwnProperty(newStatus))
      return res.status(400).send({
        message: `ERROR: Invalid order status "${newStatus}"`,
      });

    order.status = newStatus;

    return res.status(200).send(activeOrders);
  } catch (err) {
    return res.status(500).send({ message: "Internal Error" });
  }
});

app.get("/get-table/:tableID", (req: Request, res: Response) => {
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

app.get("/get-tables", (req: Request, res: Response) => {
  return res.status(200).send(tables);
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
