import { Dish } from "./dish";
import { ThemeProps } from "./theme";

export type RestaurantData = {
  dishes: Dish[];
  categories: Category[];
  theme: ThemeProps;
  logo: string;
};

export type Table = {
  id: number;
  activeOrders: number[];
};

export type Category = {
  id: number;
  title: string;
};
