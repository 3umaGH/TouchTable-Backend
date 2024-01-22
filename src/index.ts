import { mockCategories, mockDishes } from "./mockData";
import { Restaurant } from "./restaurant/Restaurant";
import { RestaurantAggregator } from "./restaurant/RestaurantAggregator";
import { SocketManager } from "./socket/SocketManager";
import { StatisticsManager } from "./statistics/StatisticsManager";

require("socket.io");
const app = require("express");
const cors = require("cors");

const theme = {
  primary300: "#f0676f",
  primary600: "D64550",
  isLightTheme: false,
};

/* Mock restaurants */
const restaurant = new Restaurant(
  0,
  "Name",
  "https://4m4you.com/wp-content/uploads/2020/06/logo-placeholder-300x120.png",
  theme,
  mockDishes,
  mockCategories,
  5
);

//app.use(cors());

export const restaurants = new Map<number, Restaurant>();

restaurants.set(0, restaurant);

const aggregator = new RestaurantAggregator(restaurants);
aggregator.initalizeListeners();

const socketManager = new SocketManager(aggregator);
socketManager.startListening(3001);
socketManager.initalizeListeners();

const statisticsManager = new StatisticsManager(aggregator);
statisticsManager.initalizeListeners();
