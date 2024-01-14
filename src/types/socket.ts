import { Order, RestaurantData, Table, Notification } from "./restaurant";

export interface ServerToClientEvents {
  newNotification: (notification: Notification) => void;
  notificationStatusUpdate: (notification: Notification) => void;

  newOrderCreated: (order: Order) => void;
  orderUpdate: (order: Order) => void;
  
}

export interface ClientToServerEvents {
  joinRoom: (
    restaurantID: number,
    room: "waiters" | "kitchen" | string,
    callback: (e: boolean | { error: boolean, message: string }) => void
  ) => void;

  createOrder: (
    restaurantID: number,
    order: Order,
    callback: (e: Order | { error: boolean, message: string }) => void
  ) => void;

  updateOrder: (
    restaurantID: number,
    id: number,
    order: Order,
    callback: (e: Order | { error: boolean, message: string }) => void
  ) => void;

  createCheckRequest: (
    restaurantID: number,
    tableID: number,
    payment: "cash" | "card",
    callback: (e: boolean | { error: boolean, message: string }) => void
  ) => void;

  createAssistanceRequest: (
    restaurantID: number,
    tableID: number,
    callback: (e: boolean | { error: boolean, message: string }) => void
  ) => void;

  getTableOrders: (
    restaurantID: number,
    id: number,
    callback: (e: Order[] | { error: boolean, message: string }) => void
  ) => void;

  getRestaurantData: (
    id: number,
    callback: (e: RestaurantData | { error: boolean, message: string }) => void
  ) => void;

  getRestaurantOrders: (
    id: number,
    callback: (e: Order[] | { error: boolean, message: string }) => void
  ) => void;

  getRestaurantNotifications: (
    id: number,
    callback: (e: Notification[] | { error: boolean, message: string }) => void
  ) => void;

  setNotificationInactive: (
    id: string,
    callback: (e: Notification | { error: boolean, message: string }) => void
  ) => void;
}

export interface InterServerEvents {}
