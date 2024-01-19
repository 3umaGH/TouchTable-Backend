import { Dish } from "./dish";

export type RestaurantData = {
  dishes: Dish[];
  categories: Category[];

  primaryColors: string[];
};

export type Table = {
  id: number;
  activeOrders: number[];
};

export type Category = {
  id: number;
  title: string;
};
