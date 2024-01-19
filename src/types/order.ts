import { DishOption, Ingredient } from "./dish";

export type Order = {
  id: number | null;
  time: number | null;
  origin: number;
  status: OrderStatus;

  items: OrderItem[];
  note: string;
};

export const OrderStatuses = {
  INIT: "INIT",
  ORDER_RECEIVED: "ORDER_RECEIVED",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  FINISHED: "FINISHED",
};

export type OrderItem = {
  id: string;
  dish: CustomizedDish;
  amount: number;
  status: OrderItemStatus;
};

export const OrderItemStatuses = {
  INIT: "INIT",
  IN_PROGRESS: "IN_PROGRESS",
  PREPARED: "PREPARED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

export type OrderStatus = keyof typeof OrderStatuses;
export type OrderItemStatus = keyof typeof OrderItemStatuses;

export type CustomizedDish = {
  dishID: number;

  removedIngredients: Ingredient[];
  addedOptions: DishOption[];
};
