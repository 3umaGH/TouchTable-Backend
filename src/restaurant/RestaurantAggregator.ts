import { EventEmitter } from "stream";
import { Restaurant } from "./Restaurant";
import { Order, OrderItem, OrderItemStatus, OrderStatus } from "../types/order";
import { Notification, NotificationType } from "../types/notification";
import { v4 as uuidv4 } from "uuid";
import { calculateOrderItemTotal, calculateOrderTotal } from "../util";

export class RestaurantAggregator extends EventEmitter {
  restaurants: Restaurant[];

  constructor(restaurants: Map<number, Restaurant>) {
    super();
    this.restaurants = Array.from(restaurants.values());
  }

  initalizeListeners = () => {
    // RESTAURANT EVENT LISTENERS
    this.restaurants.forEach((restaurant) => {
      restaurant.on(
        "notificationStatusUpdate",
        (notification: Notification) => {
          this.emit("notificationStatusUpdate", restaurant.id, notification);
        }
      );

      restaurant.on("newOrder", (order: Order) => {
        this.emit("newOrder", restaurant.id, order);

        this.sendNotification(restaurant, order.origin, "NEW_ORDER", {
          orderID: [order.id!],
        });
      });

      restaurant.on(
        "orderStatusUpdate",
        (order: Order, newStatus: OrderStatus, oldStatus: OrderStatus) => {
          this.emit("orderStatusUpdate", restaurant.id, order);

          if (newStatus === "FINISHED" || newStatus === "CANCELLED")
            restaurant.finishOrder(order);
        }
      );

      restaurant.on(
        "orderItemStatusUpdate",
        (
          order: Order,
          orderItem: OrderItem,
          newStatus: OrderItemStatus,
          oldStatus: OrderItemStatus
        ) => {
          if (order.status !== "CANCELLED" && order.status !== "FINISHED")
            order.status = this.determineOrderStatus(order);

          if (newStatus === "PREPARED") {
            this.sendNotification(
              restaurant,
              order.origin,
              "READY_FOR_DELIVERY",
              { orderID: [order.id!], orderItemID: orderItem.id }
            );
          }

          if (newStatus === "CANCELLED") {
            this.sendNotification(
              restaurant,
              order.origin,
              "ORDER_ITEM_CANCELLED",
              { orderID: [order.id!], orderItemID: orderItem.id }
            );

            /* Recalculate order price on item cancellation */
            order.price = calculateOrderTotal(restaurant, order);
            orderItem.price = calculateOrderItemTotal(restaurant, orderItem);
          }

          this.emit("orderItemStatusUpdate", restaurant.id, order, orderItem);
        }
      );

      restaurant.on("assistanceRequest", (origin: number) => {
        this.sendNotification(restaurant, origin, "NEED_ASSISTANCE");

        this.emit("assistanceRequest", restaurant.id);
      });

      restaurant.on(
        "checkRequest",
        (origin: number, paymentBy: "cash" | "card") => {
          const originOrders = restaurant.getTableOrders(origin);
          /*.filter((order) => order.origin !== null && order.origin === origin)
            .filter((order) => order.status !== "FINISHED");*/

          this.sendNotification(restaurant, origin, "CHECK_REQUESTED", {
            orderID: originOrders.map((order) => order.id as number),
            paymentBy: paymentBy,
          });

          this.emit("checkRequest", restaurant.id, paymentBy);
        }
      );

      restaurant.on("newNotification", (notification: Notification) => {
        this.emit("newNotification", restaurant.id, notification);
      });

      restaurant.on("finishedOrCancelledOrder", (order: Order) => {
        this.emit("finishedOrCancelledOrder", restaurant.id, order);
      });

      restaurant.on("restaurantDataUpdated", () => {
        this.emit("restaurantDataUpdated", restaurant.id);
      });
    });
  };

  private determineOrderStatus: (order: Order) => OrderStatus = (order) => {
    const itemStatuses = order.items.map((item) => item.status);
    const contains = (status: OrderStatus) => {
      return itemStatuses.some((item) => item == status);
    };

    if (itemStatuses.every((status) => status == "CANCELLED")) {
      return "CANCELLED";
    }

    if (contains("IN_PROGRESS")) {
      return "IN_PROGRESS";
    }

    if (
      contains("DELIVERED") &&
      !contains("IN_PROGRESS") &&
      !contains("ORDER_RECEIVED") &&
      !contains("INIT")
    ) {
      return "DELIVERED";
    }

    return order.status;
  };

  private sendNotification = (
    restaurant: Restaurant,
    origin: number,
    type: NotificationType,
    extraData?: {
      orderItemID?: string;
      orderID?: number[];
      paymentBy?: "cash" | "card";
    }
  ) => {
    try {
      const notification: Notification = {
        id: uuidv4(),
        time: Date.now(),
        origin: origin,
        type: type,
        active: true,

        extraData: {},
      };

      if (extraData?.orderItemID !== undefined)
        notification.extraData.orderItemID = extraData.orderItemID;

      if (extraData?.orderID !== undefined)
        notification.extraData.orderID = extraData.orderID;

      if (extraData?.paymentBy !== undefined)
        notification.extraData.paymentBy = extraData.paymentBy;

      restaurant.createNotification(notification);

      console.log(`[${restaurant.id}] Sent new notification ${type}`);
    } catch (err) {
      console.log(err);
    }
  };
}
