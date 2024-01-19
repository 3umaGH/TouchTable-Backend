import { Category, Dish } from "./dish";


export type RestaurantData = {
  dishes: Dish[];
  categories: Category[];
};

export type Table = {
  id: number;
  activeOrders: number[];
};
