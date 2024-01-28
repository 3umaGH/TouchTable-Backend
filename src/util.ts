import { restaurants } from ".";
import { Restaurant } from "./restaurant/Restaurant";
import {
  Order,
  OrderItem,
  OrderItemStatuses,
  OrderStatuses,
} from "./types/order";
import {} from "./types/restaurant";

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
  const restaurant = restaurants.get(restaurantID) as Restaurant;
  if (!restaurant) throw new Error("Invalid restaurant ID");

  return restaurant.dishes.find((dish) => dish.id === id);
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

const calculateOrderItemTotal = (
  restaurant: Restaurant,
  orderItem: OrderItem
) => {
  const dishObj = restaurant.getDishByID(orderItem.dish.dishID);

  if (orderItem.status === "CANCELLED" || !dishObj) {
    return {
      price: 0,
      discount: 0,
      extras: 0,
      finalPrice: 0,
    };
  }

  const price = dishObj.price * orderItem.amount;
  const discount = dishObj.discount * orderItem.amount;

  const extras = orderItem.dish.addedOptions.reduce(
    (totalPrice, option) => (totalPrice = totalPrice + option.price),
    0
  );

  const finalPrice = price + extras - discount;

  return { price, discount, extras, finalPrice };
};

export const calculateOrderTotal = (restaurant: Restaurant, order: Order) => {
  const itemPrices = order.items.map((item) =>
    calculateOrderItemTotal(restaurant, item)
  );

  const accumulator = {
    price: 0,
    discount: 0,
    extras: 0,
    finalPrice: 0,
  };

  for (const item of itemPrices) {
    accumulator.price += item.price || 0;
    accumulator.discount += item.discount || 0;
    accumulator.extras += item.extras || 0;
  }

  accumulator.finalPrice =
    accumulator.price + accumulator.extras - accumulator.discount;

  return accumulator;
};
