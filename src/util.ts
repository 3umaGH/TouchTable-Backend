import { restaurants } from ".";
import { Restaurant } from "./restaurant/Restaurant";
import {
  Order,
  OrderItem,
  OrderItemStatuses,
  OrderItemUpdateEvent,
  OrderItemUpdateType,
  OrderStatuses,
} from "./types/restaurant";

export const validateOrder = (restaurantID: number, order: Order): void => {
  const restaurant = restaurants.get(restaurantID) as Restaurant;
  if (!restaurant) throw new Error("Invalid restaurant ID");

  order.items.every((item) => {
    const dish = restaurant.dishes.find((dish) => dish.id === item.dish.dishID);

    if (item.amount <= 0 || item.amount > 10)
      throw new Error("Item amount should be between 1-10.");

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

export const catchError = (
  err: any,
  callback: (
    e:
      | any
      | {
          error: boolean;
          message: string;
        }
  ) => void
) => {
  if (err instanceof Error) callback({ error: true, message: err.message });
  else callback({ error: true, message: "Unknown Error" });
};
