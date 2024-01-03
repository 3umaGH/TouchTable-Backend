import { dishes } from ".";
import { Order, OrderItemStatuses, OrderStatuses } from "./types/globalTypes";

export const validateOrder = (order: Order): void => {
  order.items.every((item) => {
    const dish = dishes.find((dish) => dish.id === item.dish.dishID);

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
