import { dishes } from ".";
import { Order } from "./types/globalTypes";

export const orderHasValidOptionsIngredients = (order: Order): boolean => {
  return order.items.every((item) => {
    const dish = dishes.find((dish) => dish.id === item.dish.dishID);

    if (!dish) {
      return false;
    }

    const isValidOption = item.dish.addedOptions.every((clientOption) =>
      dish.params.options.some(
        (trueOption) =>
          trueOption.option === clientOption.option &&
          clientOption.enabled === true
      )
    );

    const isValidIngredient = item.dish.removedIngredients.every(
      (clientIngredient) =>
        dish.params.ingredients.some(
          (trueIngredient) =>
            trueIngredient.name === clientIngredient.name &&
            clientIngredient.removable === true
        )
    );

    return isValidOption && isValidIngredient;
  });
};
