import { restaurants } from ".";
import { Restaurant } from "./classes/Restaurant";
import {
  Order,
  OrderItem,
  OrderItemStatuses,
  OrderItemUpdateEvent,
  OrderItemUpdateType,
  OrderStatuses,
} from "./types/restaurant";

export const validateOrder = (restaurantID: number, order: Order): void => {
  try {
    const restaurant = restaurants.get(restaurantID) as Restaurant;
    if (!restaurant) throw new Error("Invalid restaurant ID");

    order.items.every((item) => {
      const dish = restaurant.dishes.find(
        (dish) => dish.id === item.dish.dishID
      );

      if (!dish) throw new Error("Invalid dish ID.");

      if (!OrderItemStatuses.hasOwnProperty(item.status))
        throw new Error("Invalid orderItem status.");

      if (!OrderStatuses.hasOwnProperty(order.status))
        throw new Error("Invalid order status.");

      const isValidOption = item.dish.addedOptions.every((clientOption) =>
        dish.params.options.some(
          (trueOption) =>
            trueOption.option === clientOption.option &&
            trueOption.enabled === true
        )
      );

      const isValidIngredient = item.dish.removedIngredients.every(
        (clientIngredient) =>
          dish.params.ingredients.some(
            (trueIngredient) =>
              trueIngredient.name === clientIngredient.name &&
              trueIngredient.removable === true
          )
      );

      if (!isValidOption) throw new Error("Invalid dish options.");

      if (!isValidIngredient) throw new Error("Invalid dish ingredient.");
    });
  } catch (err) {
    console.log(err);
  }
};

export const detectOrderItemUpdate = (newOrder: Order, prevOrder: Order) => {
  const updates: OrderItemUpdateEvent[] = [];

  newOrder.items.forEach((newItem) => {
    const prevItem = prevOrder.items.find((item) => item.id === newItem.id);

    if (!prevItem) {
      return;
    }

    let type: OrderItemUpdateType | null = null;

    switch (true) {
      case prevItem.status === OrderItemStatuses.INIT &&
        newItem.status === OrderItemStatuses.IN_PROGRESS:
        type = "IsPreparing";
        break;

      case prevItem.status === OrderItemStatuses.IN_PROGRESS &&
        newItem.status === OrderItemStatuses.PREPARED:
        type = "IsPrepared";
        break;

      case prevItem.status === OrderItemStatuses.IN_PROGRESS &&
        newItem.status === OrderItemStatuses.CANCELLED:
        type = "IsCancelled";
        break;

      case prevItem.status === OrderItemStatuses.INIT &&
        newItem.status === OrderItemStatuses.CANCELLED:
        type = "IsCancelled";
        break;

      default:
        break;
    }

    if (type) updates.push({ type: type, item: newItem });
  });

  return updates;
};

export const getDishByID = (restaurantID: number, id: number) => {
  try {
    const restaurant = restaurants.get(restaurantID) as Restaurant;
    if (!restaurant) throw new Error("Invalid restaurant ID");

    return restaurant.dishes.find((dish) => dish.id === id);
  } catch (err) {
    console.log(err);
  }
};
