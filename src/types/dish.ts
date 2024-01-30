export type Ingredient = {
  name: string;
  removable: boolean;
};

export type DishOption = {
  option: string;
  price: number;
  enabled: boolean;
};

export type Dish = {
  id: number;
  categoryId: number;
  image: string;

  price: number;
  discount: number;

  params: {
    title: string;
    description: string;
    quantity: string; // tk or weight
    ingredients: Ingredient[];
    options: DishOption[];
    available: boolean;
  };
};

export type UnverifiedDish = Omit<Dish, "id"> & {
  id: number | null;
};
