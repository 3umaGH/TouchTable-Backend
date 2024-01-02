export type Order = {
  id: number | null;
  time: number | null;
  origin: number;
  status: OrderStatus;

  items: OrderItem[];
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
};

export const OrderStatuses = {
  INIT: "INIT",
  ORDER_RECEIVED: "ORDER_RECEIVED",
  IN_PROGRESS: "IN_PROGRESS",
  DELIVERED: "DELIVERED",
};

export type OrderStatus = keyof typeof OrderStatuses;
export type OrderItemStatus = keyof typeof OrderItemStatuses;

export type CustomizedDish = {
  dishID: number;

  removedIngredients: Ingredient[];
  addedOptions: DishOption[];
};

export type Table = {
  id: number;
  status: TableStatus;
  activeOrders: number[];
};

export type TableStatus =
  | "EMPTY"
  | "WAITING_ORDER"
  | "WAITING_DELIVERY"
  | "WAITING_CHECK"
  | "WAITING_ASSISTANCE";

export type Ingredient = {
  name: string;
  removable: boolean;
};

export type DishOption = {
  option: string;
  price: number;
  enabled: boolean;
};

export type Dish = {
  id: number;
  categoryId: number;
  image: string;

  price: number;
  discount: number;

  params: {
    title: string;
    description: string;
    quantity: string; // tk or weight
    ingredients: Ingredient[];
    options: DishOption[];
    available: boolean;
  };
};

export type Category = {
  id: number;
  title: string;
};