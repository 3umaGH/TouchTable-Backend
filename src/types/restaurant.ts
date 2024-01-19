import { Dish } from "./dish";

export type RestaurantData = {
  dishes: Dish[];
  categories: Category[];
};

export type Table = {
  id: number;
  activeOrders: number[];
};

export type Category = {
  id: number;
  title: string;
};
