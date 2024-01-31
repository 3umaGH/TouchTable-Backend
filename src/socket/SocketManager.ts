import { Server } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
} from "../types/socket";
import { RestaurantAggregator } from "../restaurant/RestaurantAggregator";
import { catchError } from "../util";
import { Order, OrderItem } from "../types/order";
import { Notification } from "../types/notification";
import { StatisticsManager } from "../statistics/StatisticsManager";
import { dishSchema, unverifiedDishSchema } from "../validation/dishValidation";
import {
  categorySchema,
  unverifiedCategorySchema,
} from "../validation/categoryValidation";
import {
  orderItemStatusSchema,
  orderSchema,
  orderStatusSchema,
} from "../validation/orderValidation";

export class SocketManager {
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>;
  aggregator: RestaurantAggregator;
  statistics: StatisticsManager;

  constructor(aggregator: RestaurantAggregator, statistics: StatisticsManager) {
    this.io = new Server<
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

    this.aggregator = aggregator;
    this.statistics = statistics;
  }

  startListening = (port: number) => {
    this.io.listen(port);
    console.log(`Listening on ${port} port.`);
  };

  initalizeListeners = () => {
    const aggregatorEvents = () => {
      this.aggregator.on(
        "notificationStatusUpdate",
        (restaurantID, notification) => {
          this.io
            .to(`${restaurantID}_waiters`)
            .emit("notificationStatusUpdate", notification);
        }
      );

      this.aggregator.on("newOrder", (restaurantID, order: Order) => {
        this.io
          .to(`${restaurantID}_waiters`)
          .to(`${restaurantID}_kitchen`)
          .to(`${restaurantID}_table_${order.origin}`)
          .to(`${restaurantID}_admin`)
          .emit("newOrderCreated", order);
      });

      this.aggregator.on("orderStatusUpdate", (restaurantID, order: Order) => {
        this.io
          .to(`${restaurantID}_waiters`)
          .to(`${restaurantID}_kitchen`)
          .to(`${restaurantID}_table_${order.origin}`)
          .to(`${restaurantID}_admin`)
          .emit("orderUpdate", order);
      });

      this.aggregator.on(
        "orderItemStatusUpdate",
        (restaurantID, order: Order, orderItem: OrderItem) => {
          this.io
            .to(`${restaurantID}_waiters`)
            .to(`${restaurantID}_kitchen`)
            .to(`${restaurantID}_table_${order.origin}`)
            .to(`${restaurantID}_admin`)
            .emit("orderUpdate", order);
        }
      );

      this.aggregator.on(
        "newNotification",
        (restaurantID, notification: Notification) => {
          this.io
            .to(`${restaurantID}_waiters`)
            .emit("newNotification", notification);
        }
      );

      this.aggregator.on(
        "finishedOrCancelledOrder",
        (restaurantID, order: Order) => {
          this.io
            .to(`${restaurantID}_table_${order.origin}`)
            .to(`${restaurantID}_admin`)
            .emit("tableSessionClear");
        }
      );

      this.aggregator.on("restaurantDataUpdated", (restaurantID: number) => {
        this.io.emit("restaurantDataUpdated");
      });
    };

    const socketEvents = () => {
      this.io.on("connection", (socket) => {
        socket.on("joinRoom", (restaurantID, room, callback) => {
          try {
            const restaurant = this.getRestaurantById(restaurantID);

            socket.join(`${restaurantID}_${room}`);
            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantNotifications", (restaurantID, callback) => {
          try {
            const restaurant = this.getRestaurantById(restaurantID);
            const notifications = restaurant.getNotifications();

            callback(notifications);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("setNotificationInactive", (restaurantID, id, callback) => {
          try {
            const restaurant = this.getRestaurantById(restaurantID);
            restaurant.setNotificationInactive(id);

            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantOrders", (restaurantID, callback) => {
          try {
            const restaurant = this.getRestaurantById(restaurantID);
            const orders = restaurant.getOrders();

            callback(orders);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantStats", (restaurantID, callback) => {
          try {
            const statistics = this.statistics
              .getStatistics(restaurantID)
              ?.timeframes.values();

            callback([...statistics]);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("updateDish", (restaurantID, dish, callback) => {
          try {
            const { error } = dishSchema.validate(dish);
            if (error) throw new Error(error.message);

            const restaurant = this.getRestaurantById(restaurantID);

            restaurant.updateDish(dish);
            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("createDish", (restaurantID, dish, callback) => {
          try {
            const { error } = unverifiedDishSchema.validate(dish);
            if (error) throw new Error(error.message);

            const restaurant = this.getRestaurantById(restaurantID);

            restaurant.createDish(dish);
            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on(
          "updateOrderStatus",
          (restaurantID, id, newStatus, callback) => {
            try {
              const { error } = orderStatusSchema.validate(newStatus);
              if (error) throw new Error(error.message);

              const restaurant = this.getRestaurantById(restaurantID);

              restaurant.updateOrderStatus(id, newStatus);
              callback(true);
            } catch (err) {
              catchError(err, callback);
            }
          }
        );

        socket.on(
          "updateOrderItemStatus",
          (restaurantID, orderID, orderItemID, newStatus, callback) => {
            try {
              const { error } = orderItemStatusSchema.validate(newStatus);
              if (error) throw new Error(error.message);

              const restaurant = this.getRestaurantById(restaurantID);
              const order = restaurant.getOrderByID(orderID);

              restaurant.updateOrderItemStatus(orderItemID, order, newStatus);
              callback(true);
            } catch (err) {
              catchError(err, callback);
            }
          }
        );

        socket.on("createOrder", (restaurantID, order, callback) => {
          try {
            const { error } = orderSchema.validate(order);
            if (error) throw new Error(error.message);

            const restaurant = this.getRestaurantById(restaurantID);
            const assignedOrder = restaurant.createOrder(order);

            callback(assignedOrder);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getTableOrders", (restaurantID, tableID, callback) => {
          try {
            const restaurant = this.getRestaurantById(restaurantID);
            const tableOrders = restaurant.getTableOrders(tableID);

            callback(tableOrders);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantData", (restaurantID, callback) => {
          try {
            const restaurant = this.getRestaurantById(restaurantID);
            const response = {
              name: restaurant.getName(),
              logo: restaurant.getLogo(),
              dishes: restaurant.getDishes(),
              categories: restaurant.getCategories(),
              tables: restaurant.getTables(),
              theme: restaurant.getTheme(),
            };

            callback(response);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on(
          "createAssistanceRequest",
          (restaurantID, tableID, callback) => {
            try {
              const restaurant = this.getRestaurantById(restaurantID);

              restaurant.sendAssistanceRequest(tableID);

              callback(true);
            } catch (err) {
              catchError(err, callback);
            }
          }
        );

        socket.on(
          "createCheckRequest",
          (restaurantID, tableID, paymentBy, callback) => {
            try {
              const restaurant = this.getRestaurantById(restaurantID);

              restaurant.sendCheckRequest(tableID, paymentBy);

              callback(true);
            } catch (err) {
              catchError(err, callback);
            }
          }
        );

        socket.on("createCategory", (restaurantID, category, callback) => {
          try {
            const { error } = unverifiedCategorySchema.validate(category);
            if (error) throw new Error(error.message);

            const restaurant = this.getRestaurantById(restaurantID);

            restaurant.createCategory(category);
            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("updateCategory", (restaurantID, category, callback) => {
          try {
            const { error } = categorySchema.validate(category);
            if (error) throw new Error(error.message);

            const restaurant = this.getRestaurantById(restaurantID);

            restaurant.updateCategory(category);
            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("deleteCategory", (restaurantID, category, callback) => {
          try {
            const { error } = categorySchema.validate(category);
            if (error) throw new Error(error.message);

            const restaurant = this.getRestaurantById(restaurantID);

            restaurant.deleteCategory(category);
            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });
      });
    };

    aggregatorEvents();
    socketEvents();
  };

  private getRestaurantById = (id: number) => {
    const restaurant = this.aggregator.restaurants.find(
      (restaurant) => restaurant.id === id
    );

    if (!restaurant) throw new Error("Invalid Restaurant ID");

    return restaurant;
  };
}
