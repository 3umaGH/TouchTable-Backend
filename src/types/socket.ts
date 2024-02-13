import { JWTPayload, RefreshToken } from "./auth";
import { Dish, DraftDish } from "./dish";
import { Notification } from "./notification";
import { DraftOrder, Order, OrderItemStatus, OrderStatus } from "./order";
import { Category, RestaurantData, DraftCategory, Table } from "./restaurant";
import { StatsKey } from "./statistics";
import { ThemeProps } from "./theme";

export interface ServerToClientEvents {
  newNotification: (notification: Notification) => void;
  notificationStatusUpdate: (notification: Notification) => void;

  newOrderCreated: (order: Order) => void;
  orderUpdate: (order: Order) => void;
  orderItemStatusUpdate: (dishID: number, newStatus: OrderItemStatus) => void;

  tableSessionClear: () => void;
  restaurantDataUpdated: () => void;
  restaurantSessionsUpdated: () => void;

  tokenRefresh: ({ access }: { access: string }) => void;
}

export type ClientToServerEvents = AdminClientEvents &
  StaffClientEvents &
  ClientUserEvents;

type AdminClientEvents = {
  createCategory: (
    restaurantID: number,
    category: DraftCategory,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  updateCategory: (
    restaurantID: number,
    category: Category,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  deleteCategory: (
    restaurantID: number,
    category: Category,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  createDish: (
    restaurantID: number,
    dish: DraftDish,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  updateDish: (
    restaurantID: number,
    dish: Dish,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  getRestaurantStats: (
    id: number,
    callback: (e: StatsKey[] | { error: boolean; message: string }) => void
  ) => void;

  getRestaurantSessions: (
    id: number,
    callback: (e: RefreshToken[] | { error: boolean; message: string }) => void
  ) => void;

  generateAuthorizationToken: (
    restaurantID: number,
    payload: JWTPayload,
    callback: (e: string | { error: boolean; message: string }) => void
  ) => void;

  revokeTokenAccess: (
    restaurantID: number,
    id: string,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  setTheme: (
    restaurantID: number,
    theme: ThemeProps,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  addTable: (
    restaurantID: number,
    callback: (e: Table | { error: boolean; message: string }) => void
  ) => void;

  deleteTable: (
    restaurantID: number,
    id: number,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  updateDetails: (
    restaurantID: number,
    { name, description }: { name: string; description: string },
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  uploadLogo: (
    restaurantID: number,
    file: Buffer,
    callback: (e: string | { error: boolean; message: string }) => void
  ) => void;

  setLogo: (
    restaurantID: number,
    url: string,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;
};

type StaffClientEvents = {
  updateOrderStatus: (
    restaurantID: number,
    id: number,
    newStatus: OrderStatus,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  updateOrderItemStatus: (
    restaurantID: number,
    orderID: number,
    orderItemID: string,
    newStatus: OrderItemStatus,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  getRestaurantOrders: (
    id: number,
    callback: (e: Order[] | { error: boolean; message: string }) => void
  ) => void;

  getRestaurantNotifications: (
    id: number,
    callback: (e: Notification[] | { error: boolean; message: string }) => void
  ) => void;

  setNotificationInactive: (
    restaurantID: number,
    id: string,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;
};

type ClientUserEvents = {
  joinRoom: (
    restaurantID: number,
    room: "waiter" | "kitchen" | string,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  createOrder: (
    restaurantID: number,
    order: DraftOrder,
    callback: (e: Order | { error: boolean; message: string }) => void
  ) => void;

  createCheckRequest: (
    restaurantID: number,
    tableID: number,
    payment: "cash" | "card",
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  createAssistanceRequest: (
    restaurantID: number,
    tableID: number,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  getTableOrders: (
    restaurantID: number,
    id: number,
    callback: (e: Order[] | { error: boolean; message: string }) => void
  ) => void;

  getRestaurantData: (
    restaurantID: number,
    callback: (e: RestaurantData | { error: boolean; message: string }) => void
  ) => void;
};

export interface InterServerEvents {}

export interface SocketData extends JWTPayload {
  ip: string;
}
