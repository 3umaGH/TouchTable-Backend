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
import { LogEvent } from "../logger/Logger";
import { saveLogo, validateLogo } from "../file/LogoManager";

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
    statistics: StatisticsManager,
    http:any,
  ) {
    this.io = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(http,{
      maxHttpBufferSize: 6e6,
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
            LogEvent(restaurantID, socket.data, `Joined ${room} room.`);
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
            LogEvent(restaurantID, socket.data, `Retreive notifications.`);
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
            LogEvent(
              restaurantID,
              socket.data,
              `Set notification ${id} inactive.`
            );
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
            LogEvent(restaurantID, socket.data, `Retreive global orders.`);
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
            LogEvent(restaurantID, socket.data, `Retreive statistics.`);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("getRestaurantSessions", (restaurantID, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            callback(this.authenticator.getSessions(restaurantID));
            LogEvent(restaurantID, socket.data, `Retreive sessions.`);
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
            LogEvent(
              restaurantID,
              socket.data,
              `Update dish "${dish.params.title}" (${dish.id}).`
            );
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
            LogEvent(
              restaurantID,
              socket.data,
              `Create dish "${dish.params.title}" (${dish.id}).`
            );
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

              LogEvent(
                restaurantID,
                socket.data,
                `Update Order Status (order: ${id}, new status: ${newStatus}).`
              );
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

              LogEvent(
                restaurantID,
                socket.data,
                `Update Order Item (${orderItemID}) Status (order: ${orderID}, new status: ${newStatus}).`
              );
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
            LogEvent(
              restaurantID,
              socket.data,
              `Create Order (#${assignedOrder.id}) (items: ${assignedOrder.items.length}) with total price of ${assignedOrder.price?.finalPrice}.`
            );
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
            LogEvent(
              restaurantID,
              socket.data,
              `Retreive ${tableID} table orders.`
            );
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
              description: restaurant.getDescription(),
              logo: restaurant.getLogo(),
              dishes: restaurant.getDishes(),
              categories: restaurant.getCategories(),
              tables: restaurant.getTables(),
              theme: restaurant.getTheme(),
            };

            callback(response);
            LogEvent(restaurantID, socket.data, `Retreive restaurant data.`);
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
              LogEvent(
                restaurantID,
                socket.data,
                `Create assistance request (table: ${tableID}).`
              );
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
              LogEvent(
                restaurantID,
                socket.data,
                `Create check request (table: ${tableID}, type: ${paymentBy}).`
              );
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
            LogEvent(
              restaurantID,
              socket.data,
              `Create category "${category.title}" id: (${category.id}).`
            );
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
            LogEvent(
              restaurantID,
              socket.data,
              `Update category "${category.title}" id: (${category.id}).`
            );
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
            LogEvent(
              restaurantID,
              socket.data,
              `Delete category "${category.title}" id: (${category.id}).`
            );
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
              LogEvent(
                restaurantID,
                socket.data,
                `Generate authorization token (roles: ${payload.roles.join(
                  ", "
                )}, table: ${payload.tableID}).`
              );
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
              LogEvent(
                restaurantID,
                socket.data,
                `Revoke token access (${payload}).`
              );
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
            LogEvent(restaurantID, socket.data, `Update theme (${payload}).`);
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("addTable", async (restaurantID, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            const restaurant = this.getRestaurantById(restaurantID);
            const table = restaurant.addTable();

            callback(table);
            LogEvent(
              restaurantID,
              socket.data,
              `Add new table (id: ${table.id}).`
            );
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("deleteTable", async (restaurantID, tableID, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            const restaurant = this.getRestaurantById(restaurantID);
            restaurant.deleteTable(tableID);

            callback(true);
            LogEvent(
              restaurantID,
              socket.data,
              `Delete table (id: ${tableID}).`
            );
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("updateDetails", async (restaurantID, details, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            const restaurant = this.getRestaurantById(restaurantID);
            restaurant.setDetails(details);

            callback(true);
            LogEvent(
              restaurantID,
              socket.data,
              `Update restaurant details (name: ${details.name}, description: ${restaurant.description}).`
            );
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("uploadLogo", async (restaurantID, file, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            const format = validateLogo(file);

            if (format !== "")
              saveLogo(restaurantID, file, format).then((url) => {
                callback(url);

                LogEvent(
                  restaurantID,
                  socket.data,
                  `Uploaded logo (path: ${url}).`
                );
              });
          } catch (err) {
            catchError(err, callback);
          }
        });

        socket.on("setLogo", async (restaurantID, link, callback) => {
          try {
            if (!hasRole(socket, restaurantID, "admin"))
              throw new Error("Permission Denied");

            const restaurant = this.getRestaurantById(restaurantID);
            restaurant.setLogo(link);

            LogEvent(
              restaurantID,
              socket.data,
              `Updated logo (path: ${link}).`
            );

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
