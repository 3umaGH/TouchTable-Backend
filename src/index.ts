import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
} from "./types/socket";
import { mockCategories, mockDishes } from "./mockData";
import { Server } from "socket.io";
import { Restaurant } from "./restaurant/Restaurant";
import { RestaurantAggregator } from "./restaurant/RestaurantAggregator";
import { SocketManager } from "./socket/SocketManager";
import { StatisticsManager } from "./statistics/StatisticsManager";

require("socket.io");

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents
>({
  connectionStateRecovery: {},
  pingTimeout: 7000,
  pingInterval: 3000,
  cors: {
    origin: "*",
  },
});

const lightTheme = {
  primary200: "#1448c9",
  primary300: "#405ca3",
  primary600: "#2449a6",
  isLightTheme: true,
};

const darkTheme = {
  primary200: "#cc5879",
  primary300: "#c72c58",
  primary600: "#c91448",
  isLightTheme: false,
};

/* Mock restaurants */
const restaurant = new Restaurant(
  0,
  "Name",
  "",
  darkTheme,
  mockDishes,
  mockCategories,
  5
);

export const restaurants = new Map<number, Restaurant>();

restaurants.set(0, restaurant);

const aggregator = new RestaurantAggregator(restaurants);
aggregator.initalizeListeners();

const socketManager = new SocketManager(aggregator);
socketManager.startListening(3001);
socketManager.initalizeListeners();

const statisticsManager = new StatisticsManager(aggregator);
statisticsManager.initalizeListeners();
