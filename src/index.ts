import { AuthenticationHandler } from "./authentication/AuthenticationHandler";
import { mockCategories, mockDishes } from "./mockData";
import { Restaurant } from "./restaurant/Restaurant";
import { RestaurantAggregator } from "./restaurant/RestaurantAggregator";
import { SocketManager } from "./socket/SocketManager";
import { StatisticsManager } from "./statistics/StatisticsManager";
import { encode } from "js-base64";

require("socket.io");
require("dotenv").config();

const app = require("express");
const cors = require("cors");

const theme = {
  primary300: "#f0676f",
  primary600: "#D64550",
  isLightTheme: false,
};

/* Mock restaurants */
const restaurant = new Restaurant(
  0,
  "Bobs Ribs and Steak",
  "https://4m4you.com/wp-content/uploads/2020/06/logo-placeholder-300x120.png",
  theme,
  mockDishes,
  mockCategories,
  5
);

if (!process.env.JWT_KEY) {
  throw new Error("JWT_KEY variable is not set.");
}

//app.use(cors());
export const restaurants = new Map<number, Restaurant>();

restaurants.set(0, restaurant);

const aggregator = new RestaurantAggregator(restaurants);
aggregator.initalizeListeners();

const statisticsManager = new StatisticsManager(aggregator);
statisticsManager.initalizeListeners();



export const authenticator = new AuthenticationHandler();

const getToken = async () => {
  const ok = await authenticator.generateTokens(
    ["kitchen", "user", "waiter", "admin"],
    0,
    0
  );
  console.log(encode(JSON.stringify(ok)));
};
getToken();


export const socketManager = new SocketManager(
  aggregator,
  authenticator,
  statisticsManager
);
socketManager.startListening(3001);
socketManager.initalizeListeners();
