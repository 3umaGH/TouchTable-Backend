import { Dish } from "./dish";
import { ThemeProps } from "./theme";

export type RestaurantData = {
  name: string;
  description: string;
  logo: string;
  theme: ThemeProps;
  dishes: Dish[];
  categories: Category[];

  tables: Table[];
};

export type Table = {
  id: number;
  activeOrders: number[];
};

export type Category = {
  id: number;
  title: string;
};

export type DraftCategory = Omit<Category, "id"> & {
  id: null;
};
