import { Server } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socket";
import { RestaurantAggregator } from "../restaurant/RestaurantAggregator";
import { catchError } from "../util";
import { Order, OrderItem } from "../types/order";
import { Notification } from "../types/notification";
import { StatisticsManager } from "../statistics/StatisticsManager";
import { dishSchema, DraftDishSchema } from "../validation/dishValidation";
import {
  categorySchema,
  DraftCategorySchema,
} from "../validation/categoryValidation";
import {
  orderItemStatusSchema,
  orderSchema,
  orderStatusSchema,
} from "../validation/orderValidation";
import { authMiddleware } from "./middleware/auth";
import { hasRole, hasTablePermissions } from "./authorizationUtils";
import { AuthenticationHandler } from "../authentication/AuthenticationHandler";
const jwt = require("jsonwebtoken");

export class SocketManager {
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>;
  aggregator: RestaurantAggregator;
  authenticator: AuthenticationHandler;
  statistics: StatisticsManager;

  tokenRefreshQueue: Map<string, string>;

  constructor(
    aggregator: RestaurantAggregator,
    authenticator: AuthenticationHandler,
    statistics: StatisticsManager
  ) {
    this.io = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >({
      connectionStateRecovery: {},
      pingTimeout: 7000,
      pingInterval: 3000,
      cors: {
        origin: "*",
      },
    });

    this.aggregator = aggregator;
    this.authenticator = authenticator;
    this.statistics = statistics;

    this.tokenRefreshQueue = new Map();
  }

  startListening = (port: number) => {
    this.io.listen(port);

    this.io.use(authMiddleware(this.authenticator, this));

    console.log(`Listening on ${port} port.`);
  };

  pushTokenRefreshQueue = (id: string, access: string) => {
    this.tokenRefreshQueue.set(id, access);
  };

  initalizeListeners = () => {
    const aggregatorEvents = () => {
      this.aggregator.on(
        "notificationStatusUpdate",
        (restaurantID, notification) => {
          this.io
            .to(`${restaurantID}_waiter`)
            .emit("notificationStatusUpdate", notification);
        }
      );

      this.aggregator.on("newOrder", (restaurantID, order: Order) => {
        this.io
          .to(`${restaurantID}_waiter`)
          .to(`${restaurantID}_kitchen`)
          .to(`${restaurantID}_table_${order.origin}`)
          .to(`${restaurantID}_admin`)
          .emit("newOrderCreated", order);
      });

      this.aggregator.on("orderStatusUpdate", (restaurantID, order: Order) => {
        this.io
          .to(`${restaurantID}_waiter`)
          .to(`${restaurantID}_kitchen`)
          .to(`${restaurantID}_table_${order.origin}`)
          .to(`${restaurantID}_admin`)
          .emit("orderUpdate", order);
      });

      this.aggregator.on(
        "orderItemStatusUpdate",
        (restaurantID, order: Order, orderItem: OrderItem) => {
          this.io
            .to(`${restaurantID}_waiter`)
            .to(`${restaurantID}_kitchen`)
            .to(`${restaurantID}_table_${order.origin}`)
            .to(`${restaurantID}_admin`)
            .emit("orderUpdate", order);

          this.io
            .to(`${restaurantID}_table_${order.origin}`)
            .emit(
              "orderItemStatusUpdate",
              orderItem.dish.dishID,
              orderItem.status
            );
        }
      );

      this.aggregator.on(
        "newNotification",
        (restaurantID, notification: Notification) => {
          this.io
            .to(`${restaurantID}_waiter`)
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
        this.io
          .to(`${restaurantID}_users`)
          .to(`${restaurantID}_waiter`)
          .to(`${restaurantID}_kitchen`)
          .to(`${restaurantID}_admin`)
          .emit("restaurantDataUpdated");

        console.log(`[${restaurantID}] Restaurant Data Updated.`);
      });
    };

    const socketEvents = () => {
      this.io.on("connection", (socket) => {
        if (this.tokenRefreshQueue.has(socket.id)) {
          socket.emit("tokenRefresh", {
            access: this.tokenRefreshQueue.get(socket.id)!,
          });
          /* TODO: clean this up after a while or something */
          this.tokenRefreshQueue.delete(socket.id);
        }

        socket.on("joinRoom", (restaurantID, room, callback) => {
          try {
            let isAuthorized = true;

            if (room.includes("table_")) {
              const tableID = parseInt(room.replace("table_", ""));

              isAuthorized = hasTablePermissions(socket, tableID);
            }

            if (room === "users" && !hasRole(socket, restaurantID, "user"))
              isAuthorized = false;

            if (room === "waiter" && !hasRole(socket, restaurantID, "waiter"))
              isAuthorized = false;

            if (room === "admin" && !hasRole(socket, restaurantID, "admin"))
              isAuthorized = false;

            if (!isAuthorized) throw new Error("Permission Denied");

            const restaurant = this.getRestaurantById(restaurantID);

            socket.join(`${restaurantID}_${room}`);
            callback(true);

            console.log(
              `[${restaurantID}] Client joined ${restaurantID}_${room} room.`
            );
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantNotifications", (restaurantID, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "waiter"))
              throw new Error("Permission Denied");

            const restaurant = this.getRestaurantById(restaurantID);
            const notifications = restaurant.getNotifications();

            callback(notifications);

            console.log(`[${restaurantID}] Retreive notifications.`);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("setNotificationInactive", (restaurantID, id, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "waiter"))
              throw new Error("Permission Denied");

            const restaurant = this.getRestaurantById(restaurantID);
            restaurant.setNotificationInactive(id);

            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantOrders", (restaurantID, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "waiter", "admin", "kitchen"))
              throw new Error("Permission Denied");

            const restaurant = this.getRestaurantById(restaurantID);
            const orders = restaurant.getOrders();

            callback(orders);
            console.log(`[${restaurantID}] Orders retreive.`);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantStats", (restaurantID, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            const statistics = this.statistics
              .getStatistics(restaurantID)
              ?.timeframes.values();

            callback([...statistics]);
            console.log(`[${restaurantID}] Stats retreive.`);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantSessions", (restaurantID, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            callback(this.authenticator.getSessions(restaurantID));

            console.log(`[${restaurantID}] Sessions retreive.`);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("updateDish", (restaurantID, dish, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

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
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            const { error } = DraftDishSchema.validate(dish);
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
              if (!hasRole(socket, restaurantID, "waiter"))
                throw new Error("Permission Denied");

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
              if (!hasRole(socket, restaurantID, "kitchen", "waiter"))
                throw new Error("Permission Denied");

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
            if (
              !hasRole(socket, restaurantID, "user") ||
              !hasTablePermissions(socket, order.origin)
            )
              throw new Error("Permission Denied");
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
            if (
              !hasRole(socket, restaurantID, "user") ||
              !hasTablePermissions(socket, tableID)
            )
              throw new Error("Permission Denied");

            const restaurant = this.getRestaurantById(restaurantID);
            const tableOrders = restaurant.getTableOrders(tableID);

            callback(tableOrders);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantData", (restaurantID, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "user"))
              throw new Error("Permission Denied");

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
            console.log(`[${restaurantID}] Retreive restaurant data.`);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on(
          "createAssistanceRequest",
          (restaurantID, tableID, callback) => {
            try {
              if (
                !hasRole(socket, restaurantID, "user") ||
                !hasTablePermissions(socket, tableID)
              )
                throw new Error("Permission Denied");

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
              if (
                !hasRole(socket, restaurantID, "user") ||
                !hasTablePermissions(socket, tableID)
              )
                throw new Error("Permission Denied");

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
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            const { error } = DraftCategorySchema.validate(category);
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
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

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
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            const { error } = categorySchema.validate(category);
            if (error) throw new Error(error.message);

            const restaurant = this.getRestaurantById(restaurantID);

            restaurant.deleteCategory(category);
            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on(
          "generateAuthorizationToken",
          async (restaurantID, payload, callback) => {
            try {
              if (!hasRole(socket, restaurantID, "admin"))
                throw new Error("Permission Denied");

              /*TODO: const { error } = categorySchema.validate(category);
            if (error) throw new Error(error.message);*/

              const token = await this.authenticator.generateTokens(
                payload.roles,
                payload.restaurantID,
                payload.tableID
              );

              callback(JSON.stringify(token));
            } catch (err) {
              catchError(err, callback);
            }
          }
        );
        socket.on(
          "revokeTokenAccess",
          async (restaurantID, payload, callback) => {
            try {
              if (!hasRole(socket, restaurantID, "admin"))
                throw new Error("Permission Denied");

              /*TODO: const { error } = categorySchema.validate(category);
            if (error) throw new Error(error.message);*/

              this.authenticator.revokeTokenAccess(payload);

              callback(true);
            } catch (err) {
              catchError(err, callback);
            }
          }
        );

        socket.on("setTheme", async (restaurantID, payload, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            /*TODO: const { error } = categorySchema.validate(category);
            if (error) throw new Error(error.message);*/

            const restaurant = this.getRestaurantById(restaurantID);

            restaurant.setTheme(payload);

            callback(true);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.onAny(() => {
          if (!this.authenticator.hasAccess(socket.data.id))
            socket.disconnect();
        });
      });
    };

    const authenticatorEvents = () => {
      this.authenticator.on("refreshTokensUpdated", (restaurantID: number) => {
        this.io.to(`${restaurantID}_admin`).emit("restaurantSessionsUpdated");

        console.log(`[${restaurantID}] Restaurant sessions updated.`);
      });
    };

    aggregatorEvents();
    authenticatorEvents();
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
