import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
} from "./types/socket";
import {
  mockCategories,
  mockCategories1,
  mockDishes,
  mockDishes1,
} from "./mockData";
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

/* Mock restaurants */
const restaurant = new Restaurant(0, "Name", "", mockDishes, mockCategories, 5);
const restaurant2 = new Restaurant(
  1,
  "Name",
  "",
  mockDishes1,
  mockCategories1,
  5
);

export const restaurants = new Map<number, Restaurant>();

restaurants.set(0, restaurant);
//restaurants.set(1, restaurant2);

const aggregator = new RestaurantAggregator(restaurants);
aggregator.initalizeListeners();

const socketManager = new SocketManager(aggregator);
socketManager.startListening(3001);
socketManager.initalizeListeners();

const statisticsManager = new StatisticsManager(aggregator);
statisticsManager.initalizeListeners();