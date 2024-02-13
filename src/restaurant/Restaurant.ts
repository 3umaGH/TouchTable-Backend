import { Category, Table, DraftCategory } from "../types/restaurant";
import {
  calculateOrderItemTotal,
  calculateOrderTotal,
  validateOrder,
} from "../util";
import { v4 as uuidv4 } from "uuid";
import EventEmitter from "events";
import { Dish, DraftDish } from "../types/dish";
import {
  DraftOrder,
  Order,
  OrderItemStatus,
  OrderItemStatuses,
  OrderStatus,
  OrderStatuses,
} from "../types/order";
import { Notification } from "../types/notification";
import { ThemeProps } from "../types/theme";
import { JWTPayload } from "../types/auth";

export class Restaurant extends EventEmitter {
  id: number;
  name: string;
  description: string;
  logo: string;
  theme: ThemeProps;
  dishes: Dish[];
  categories: Category[];

  orders: Order[] = [];
  notifications: Notification[] = [];

  tables: Table[] = [];

  constructor(
    id: number,
    name: string,
    description: string,
    logo: string,
    theme: ThemeProps,
    dishes: Dish[],
    categories: Category[],

    tablesAmount: number
  ) {
    super();
    this.id = id;
    this.name = name;
    this.description = description;
    this.logo = logo;
    this.theme = theme;
    this.dishes = dishes;
    this.categories = categories;

    for (let i = 0; i < tablesAmount; i++) {
      this.tables.push({ id: i, activeOrders: [] });
    }
  }

  getNotifications = () => {
    return this.notifications;
  };

  getOrders = () => {
    return this.orders;
  };

  getCategories = () => {
    return this.categories;
  };

  getDishes = () => {
    return this.dishes;
  };

  getTheme = () => {
    return this.theme;
  };

  getLogo = () => {
    return this.logo;
  };

  getName = () => {
    return this.name;
  };

  getTables = () => {
    return this.tables;
  };

  getDescription = () => {
    return this.description;
  };

  getDishByID = (id: number) => {
    const dish = this.dishes.find((dish) => dish.id === id);

    if (!dish) throw new Error("Invalid Dish ID");

    return dish;
  };

  getOrderByID = (id: number) => {
    const order = this.orders.find((order) => order.id === id);

    if (!order) throw new Error("Invalid order ID");

    return order;
  };

  setNotificationInactive = (id: string) => {
    const notification = this.notifications.find((notif) => notif.id === id);

    if (!notification) throw new Error("Notification could not be found");

    if (notification.active) {
      notification.active = false;

      this.emit("notificationStatusUpdate", notification);
    }
  };

  createOrder = (order: DraftOrder) => {
    const table = this.tables.find((table) => table.id === order.origin);

    if (order.items.length === 0)
      throw new Error("Cannot accept an empty order.");

    if (!(order.origin < this.tables.length))
      throw new Error(
        `Table ID ${order.origin} does not exist. Did you check if the TableID is correct?`
      );

    if (!table)
      throw new Error(
        `Unable to assign order sent from table #${order.origin} to a table. Table is not found.`
      );

    /* Prevent user from creating new order, while he is waiting for the check*/
    const existingRequest = this.notifications.find(
      (notification) =>
        notification.origin === order.origin &&
        notification.type === "CHECK_REQUESTED" &&
        notification.active
    );

    if (existingRequest)
      throw new Error(`Unable to add a new order, payment is in progress.`);

    validateOrder(this.id, order);

    const assignedOrder = {
      ...order,
      id:
        this.orders.reduce(
          (maxId, order) => Math.max(order.id ?? 0, maxId),
          -1
        ) + 1,
      time: Date.now(),
      status: "ORDER_RECEIVED",
      items: order.items.map((orderItem) => ({
        ...orderItem,
        id: uuidv4(),
        price: calculateOrderItemTotal(this, orderItem),
      })),

      price: calculateOrderTotal(this, order),
    } as Order;

    table.activeOrders = [...table.activeOrders, assignedOrder.id];
    this.orders.push(assignedOrder);

    this.emit("newOrder", assignedOrder);

    return assignedOrder;
  };

  updateOrderStatus = (id: number, newStatus: string) => {
    const order = this.orders.find((order) => order.id === id);

    if (!order) throw new Error("Invalid order id");

    const prevStatus = order.status;

    if (!OrderStatuses.hasOwnProperty(newStatus))
      throw new Error("Invalid order item status");

    order.status = newStatus as OrderStatus;

    this.emit("orderStatusUpdate", order, newStatus, prevStatus);
  };

  updateOrderItemStatus = (id: string, order: Order, newStatus: string) => {
    const orderItem = order.items.find((item) => item.id === id);

    if (!orderItem) throw new Error("Invalid order item");

    const prevStatus = orderItem.status;

    if (!OrderItemStatuses.hasOwnProperty(newStatus))
      throw new Error("Invalid order item status");

    orderItem.status = newStatus as OrderItemStatus;

    this.emit("orderItemStatusUpdate", order, orderItem, newStatus, prevStatus);
  };

  getTableOrders = (tableID: number) => {
    const table = this.tables[tableID];

    if (isNaN(tableID)) throw new Error(`TableID is not a number.`);

    if (!table) throw new Error(`Table with ID ${tableID} could not be found.`);

    const updatedTable = {
      ...table,
      orders: table.activeOrders
        .map((orderId) => {
          const matchingOrder = this.orders.find(
            (fullOrder) => fullOrder.id === orderId
          );
          return matchingOrder;
        })
        .filter((order) => order !== undefined) as Order[],
    };

    return updatedTable.orders;
  };

  sendAssistanceRequest = (tableID: number) => {
    if (!(tableID < this.tables.length)) throw new Error("Invalid origin");

    const existingRequest = this.notifications.find(
      (notification) =>
        notification.origin === tableID &&
        notification.type === "NEED_ASSISTANCE" &&
        notification.active
    );

    if (existingRequest) throw new Error("Request is already pending");

    this.emit("assistanceRequest", tableID);
  };

  sendCheckRequest = (tableID: number, paymentBy: "cash" | "card") => {
    if (!(tableID < this.tables.length)) throw new Error("Invalid origin");

    const existingRequest = this.notifications.find(
      (notification) =>
        notification.origin === tableID &&
        notification.type === "CHECK_REQUESTED" &&
        notification.active
    );

    if (existingRequest) throw new Error("Request is already pending");

    this.emit("checkRequest", tableID, paymentBy);
  };

  createNotification = (notification: Notification) => {
    this.notifications.push(notification);

    this.emit("newNotification", notification);
  };

  finishOrder = (order: Order) => {
    const originTable = this.tables.find((table) => table.id === order.origin);

    if (!originTable) return;

    // Clean up origin table active orders
    originTable.activeOrders = originTable.activeOrders.filter(
      (id) => id !== order.id
    );

    // Make notifications inactive (all order origin table notifications)
    this.notifications.forEach((notification) => {
      if (notification.origin === order.origin)
        this.setNotificationInactive(notification.id);
    });

    this.emit("finishedOrCancelledOrder", order);
  };

  updateCategory = (category: Category) => {
    const prevID = this.categories.findIndex((cat) => cat.id === category.id);

    if (prevID === -1) throw new Error("Invalid ID");

    if (this.categories.find((cat) => cat.title === category.title))
      throw new Error("Category with this title already exists");

    if (category.title.length > 30)
      throw new Error("Title cannot be longer than 30 characters");

    this.categories[prevID] = category;
    this.emit("restaurantDataUpdated");
  };

  createCategory = (category: DraftCategory) => {
    if (this.categories.find((cat) => cat.title === category.title))
      throw new Error("Category with this title already exists");

    const newID =
      this.categories.reduce((maxId, cat) => Math.max(cat.id ?? 0, maxId), -1) +
      1;

    this.categories.push({ id: newID, title: category.title });
    this.emit("restaurantDataUpdated");
  };

  deleteCategory = (category: Category) => {
    if (!this.categories.find((cat) => cat.id === category.id))
      throw new Error("Invalid category");

    this.categories = this.categories.filter((cat) => cat.id !== category.id);

    /* Change category of dishes in that category */
    this.dishes = this.dishes.map((dish) =>
      dish.categoryId === category.id
        ? {
            ...dish,
            categoryId: this.categories.length > 0 ? this.categories[0].id : 0,
          }
        : dish
    );

    this.emit("restaurantDataUpdated");
  };

  updateDish = (newDish: Dish) => {
    const prevDishID = this.dishes.findIndex((dish) => dish.id === newDish.id);

    if (prevDishID === -1) throw new Error("Invalid dish ID");

    if (newDish.discount > newDish.price)
      throw new Error("Discount cannot be bigger than item price");

    this.dishes[prevDishID] = newDish;
    this.emit("restaurantDataUpdated");
  };

  createDish = (newDish: DraftDish) => {
    if (newDish.discount > newDish.price)
      throw new Error("Discount cannot be bigger than item price");

    newDish.id =
      this.dishes.reduce((maxId, dish) => Math.max(dish.id ?? 0, maxId), -1) +
      1;

    this.dishes.push(newDish as Dish);

    this.emit("restaurantDataUpdated");
  };

  setTheme = (newTheme: ThemeProps) => {
    this.theme = newTheme;
    this.emit("restaurantDataUpdated");
  };

  addTable = () => {
    const tableID =
      this.tables.reduce((maxId, table) => Math.max(table.id ?? 0, maxId), -1) +
      1;

    const newTable = { id: tableID, activeOrders: [] };
    this.tables.push(newTable);
    this.emit("restaurantDataUpdated");

    return newTable;
  };

  deleteTable = (id: number) => {
    const tableIndex = this.tables.findIndex((table) => table.id === id);

    if (tableIndex === -1) throw new Error("Table not found.");
    if (this.tables[tableIndex].activeOrders.length > 0)
      throw new Error("Cannot delete table that has active orders.");

    this.tables.splice(tableIndex, 1);
    this.emit("restaurantDataUpdated");
  };

  setDetails = ({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) => {
    if (name.length === 0 || description.length === 0)
      throw new Error("Name or Description cannot be empty.");

    if (name.length >= 30)
      throw new Error("Name cannot be longer than 30 characters.");
    if (description.length > 300)
      throw new Error("Description cannot be longer than 300 characters.");

    this.name = name;
    this.description = description;

    this.emit("restaurantDataUpdated");
  };
}
