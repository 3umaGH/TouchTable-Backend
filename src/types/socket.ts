import { Dish } from "./dish";
import { Notification } from "./notification";
import { Order, OrderItemStatus, OrderStatus } from "./order";
import { RestaurantData } from "./restaurant";
import { StatsKey } from "./statistics";

export interface ServerToClientEvents {
  newNotification: (notification: Notification) => void;
  notificationStatusUpdate: (notification: Notification) => void;

  newOrderCreated: (order: Order) => void;
  orderUpdate: (order: Order) => void;

  tableSessionClear: () => void;
  restaurantDataUpdated: () => void;
}

export interface ClientToServerEvents {
  joinRoom: (
    restaurantID: number,
    room: "waiters" | "kitchen" | string,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  updateDish: (
    restaurantID: number,
    dish: Dish,
    callback: (e: boolean | { error: boolean; message: string }) => void
  ) => void;

  createOrder: (
    restaurantID: number,
    order: Order,
    callback: (e: Order | { error: boolean; message: string }) => void
  ) => void;

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

  getRestaurantOrders: (
    id: number,
    callback: (e: Order[] | { error: boolean; message: string }) => void
  ) => void;

  getRestaurantStats: (
    id: number,
    callback: (e: StatsKey[] | { error: boolean; message: string }) => void
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
}

export interface InterServerEvents {}
