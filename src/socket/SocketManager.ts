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

export class SocketManager {
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>;
  aggregator: RestaurantAggregator;

  constructor(aggregator: RestaurantAggregator) {
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
  }

  startListening = (port: number) => {
    this.io.listen(port);
  };

  initalizeListeners = () => {
    /* AGGREGATOR EVENT LISTENERS */

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
        .emit("newOrderCreated", order);
    });

    this.aggregator.on("orderStatusUpdate", (restaurantID, order: Order) => {
      this.io
        .to(`${restaurantID}_waiters`)
        .to(`${restaurantID}_kitchen`)
        .to(`${restaurantID}_table_${order.origin}`)
        .emit("orderUpdate", order);
    });

    this.aggregator.on(
      "orderItemStatusUpdate",
      (restaurantID, order: Order, orderItem: OrderItem) => {
        this.io
          .to(`${restaurantID}_waiters`)
          .to(`${restaurantID}_kitchen`)
          .to(`${restaurantID}_table_${order.origin}`)
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
          .emit("tableSessionClear");
      }
    );

    /* SOCKET EVENT LISTENERS */
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

      socket.on(
        "updateOrderStatus",
        (restaurantID, id, newStatus, callback) => {
          try {
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
            dishes: restaurant.getDishes(),
            categories: restaurant.getCategories(),
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

      socket.on("disconnect", (socket) => {});
    });
  };

  private getRestaurantById = (id: number) => {
    const restaurant = this.aggregator.restaurants.find(
      (restaurant) => restaurant.id === id
    );

    if (!restaurant) throw new Error("Invalid Restaurant ID");

    return restaurant;
  };
}
