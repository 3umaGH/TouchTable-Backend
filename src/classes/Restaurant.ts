import {
  Category,
  Dish,
  Notification,
  Order,
  Table,
} from "../types/restaurant";

export class Restaurant {
  id: number;
  name: string;
  logo: string;
  dishes: Dish[];
  categories: Category[];

  orders: Order[] = [];
  notifications: Notification[] = [];

  tables: Table[] = [];

  constructor(
    id: number,
    name: string,
    logo: string,
    dishes: Dish[],
    categories: Category[],

    tablesAmount: number
  ) {
    this.id = id;
    this.name = name;
    this.logo = logo;
    this.dishes = dishes;
    this.categories = categories;

    for (let i = -1; i < tablesAmount; i++) {
      this.tables.push({ id: i, activeOrders: [] });
    }
  }
}
