import { RestaurantAggregator } from "../restaurant/RestaurantAggregator";
import { Order } from "../types/order";
import { Statistics } from "./Statistics";

export class StatisticsManager {
  aggregator: RestaurantAggregator;
  restaurants = new Map<number, Statistics>();

  constructor(aggregator: RestaurantAggregator) {
    this.aggregator = aggregator;

    aggregator.restaurants.forEach((restaurant) => {
      this.restaurants.set(restaurant.id, new Statistics(restaurant));
    });
  }

  initalizeListeners = () => {
    this.aggregator.on(
      "finishedOrCancelledOrder",
      (restaurantID, order: Order) => {
        this.restaurants.get(restaurantID)?.onOrderFinish(order);
      }
    );

    this.aggregator.on("assistanceRequest", (restaurantID) => {
      this.restaurants.get(restaurantID)?.onAssistanceRequest();
    });

    this.aggregator.on(
      "checkRequest",
      (restaurantID, paymentBy: "cash" | "card") => {
        this.restaurants.get(restaurantID)?.onCheckRequest(paymentBy);
      }
    );
  };

  getStatistics = (restaurantID: number) => {
    const statistics = this.restaurants.get(restaurantID);

    if (!statistics) throw new Error("Invalid Restaurant ID");

    return statistics;
  };
}
