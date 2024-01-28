import { Restaurant } from "../restaurant/Restaurant";
import { Order, OrderItem } from "../types/order";
import { StatsKey } from "../types/statistics";
import { calculateOrderTotal } from "../util";

const getInitVal = (
  timeFrame: string,
  restaurant: Restaurant,
  resetIntervalMinutes: number
) => {
  return {
    timeFrame: timeFrame,
    startTime: Date.now(),
    resetInterval: resetIntervalMinutes * 1000 * 60,

    orders: {
      finished: 0,
      cancelled: 0,
      total: 0,

      totalItems: 0,
      totalTurnover: 0,
    },

    notifications: {
      assistanceRequests: 0,
    },

    checks: {
      card: 0,
      cash: 0,
    },

    dishes: restaurant.dishes.reduce(
      (acc, dish) => {
        acc[dish.params.title] = 0;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
};

export class Statistics {
  timeframes: Map<string, StatsKey>;
  restaurant: Restaurant;

  constructor(restaurant: Restaurant) {
    this.timeframes = new Map();
    this.timeframes.set("daily", getInitVal("daily", restaurant, 60 * 24));
    this.timeframes.set("hourly", getInitVal("hourly", restaurant, 60));

    this.restaurant = restaurant;
  }

  onOrderFinish = (order: Order) => {
    this.timeframes.forEach((timeframe) => {
      if (order.status === "CANCELLED") timeframe.orders.cancelled++;
      if (order.status === "FINISHED") {
        timeframe.orders.finished++;

        timeframe.orders.totalTurnover =
          timeframe.orders.totalTurnover +
          calculateOrderTotal(this.restaurant, order).finalPrice;
      }

      timeframe.orders.total++;

      const dishes = order.items as OrderItem[];

      dishes.forEach((item) => {
        timeframe.orders.totalItems = timeframe.orders.totalItems + item.amount;

        const dishName = this.restaurant.dishes.find(
          (restaurantDish) => restaurantDish.id === item.dish.dishID
        )?.params.title;

        if (dishName) timeframe.dishes[dishName] += item.amount;
      });
    });

    console.log(this.timeframes);
  };

  onAssistanceRequest = () => {
    this.timeframes.forEach((timeframe) => {
      timeframe.notifications.assistanceRequests++;
    });
  };

  onCheckRequest = (paymentBy: "cash" | "card") => {
    this.timeframes.forEach((timeframe) => {
      if (paymentBy === "cash") timeframe.checks.cash++;
      else timeframe.checks.card++;
    });
  };
}
