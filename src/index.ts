import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
} from "./types/socket";
import {
  mockCategories,
  mockDishes,
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

export const restaurants = new Map<number, Restaurant>();

restaurants.set(0, restaurant);

const aggregator = new RestaurantAggregator(restaurants);
aggregator.initalizeListeners();

const socketManager = new SocketManager(aggregator);
socketManager.startListening(3001);
socketManager.initalizeListeners();

const statisticsManager = new StatisticsManager(aggregator);
statisticsManager.initalizeListeners();