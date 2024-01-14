import { Category, Dish, Table } from "./types/restaurant";

export const mockTables: Table[] = [
  {
    id: 0,
    activeOrders: [],
  },

  {
    id: 1,
    activeOrders: [],
  },
];



export const mockDishes: Dish[] = [
  {
    id: 1,
    categoryId: 0,
    image: "https://i.imgur.com/z5uQO2g.png",
    price: 18.00,
    discount: 0,
    params: {
      title: "Salmon Salad",
      description:
        "Fresh and healthy salad with grilled salmon. A delightful mix of greens, cherry tomatoes, cucumber, and avocado. Topped with perfectly grilled salmon fillet and drizzled with a zesty lemon vinaigrette.",
      quantity: "300g",
      ingredients: [
        { name: "Mixed Greens", removable: true },
        { name: "Cherry Tomatoes", removable: true },
        { name: "Cucumber", removable: true },
        { name: "Avocado", removable: true },
        { name: "Grilled Salmon", removable: true },
        { name: "Lemon Vinaigrette", removable: true },
      ],
      options: [
        { option: "Extra Dressing", price: 1.0, enabled: true },
        { option: "Croutons", price: 0.75, enabled: true },
        { option: "Gluten-Free", price: 2.5, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 2,
    categoryId: 0,
    image: "https://i.imgur.com/QhCxr8h.png",
    price: 12.5,
    discount: 1.5,
    params: {
      title: "Mashed Potatoes",
      description:
        "Creamy mashed potatoes made with butter and cream. A classic and comforting side dish that pairs well with a variety of main courses.",
      quantity: "200g",
      ingredients: [
        { name: "Potatoes", removable: false },
        { name: "Butter", removable: true },
        { name: "Cream", removable: true },
        { name: "Salt", removable: false },
        { name: "Chives", removable: true },
      ],
      options: [
        { option: "Extra Butter", price: 1.0, enabled: true },
        { option: "Garlic Infusion", price: 1.5, enabled: true },
        { option: "Cheese Topping", price: 1.25, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 3,
    categoryId: 0,
    image: "https://i.imgur.com/n42xuG7.png",
    price: 8.99,
    discount: 1.0,
    params: {
      title: "Dumplings",
      description:
        "Savor delicious dumplings with a perfect balance of flavors. These dumplings are filled with a delightful mixture of meat and vegetables, wrapped in a thin dough and steamed to perfection.",
      quantity: "~300g",
      ingredients: [
        { name: "Dumpling Dough", removable: false },
        { name: "Meat and Vegetable Filling", removable: true },
        { name: "Soy Sauce", removable: true },
        { name: "Ginger", removable: true },
        { name: "Green Onions", removable: true },
        { name: "Sesame Oil", removable: true },
      ],
      options: [
        { option: "Extra Soy Sauce", price: 0.75, enabled: true },
        { option: "Spicy Dipping Sauce", price: 1.0, enabled: true },
        { option: "Vegetarian Filling", price: 1.5, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 4,
    categoryId: 0,
    image: "https://i.imgur.com/C77guC4.png",
    price: 18.75,
    discount: 3.0,
    params: {
      title: "Salmon Sandwich",
      description:
        "Indulge in a delightful salmon sandwich featuring grilled salmon fillet, fresh vegetables, and a zesty dressing. This sandwich is a perfect blend of flavors, with a touch of lemony goodness and a hint of crunch.",
      quantity: "2 pieces",
      ingredients: [
        { name: "Salmon Fillet", removable: false },
        { name: "Fresh Vegetables", removable: true },
        { name: "Zesty Dressing", removable: true },
        { name: "Lemon Slices", removable: true },
        { name: "Whole Grain Bread", removable: false },
      ],
      options: [
        { option: "Extra Dressing", price: 1.0, enabled: true },
        { option: "Avocado", price: 1.5, enabled: true },
        { option: "Crispy Bacon", price: 2.0, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 5,
    categoryId: 0,
    image: "https://i.imgur.com/LuV2zca.png",
    price: 14.99,
    discount: 7,
    params: {
      title: "Ice Cream Ball Sampler",
      description:
        "Indulge in a delightful sampler of 9 ice cream balls with a variety of flavors to tantalize your taste buds. Each ball is a burst of unique taste, from classic vanilla to exotic fruit flavors. A perfect treat for ice cream enthusiasts.",
      quantity: "9 balls",
      ingredients: [
        { name: "Vanilla", removable: true },
        { name: "Chocolate", removable: true },
        { name: "Strawberry", removable: true },
        { name: "Mint Chocolate Chip", removable: true },
        { name: "Coffee", removable: true },
        { name: "Pistachio", removable: true },
        { name: "Raspberry Sorbet", removable: true },
        { name: "Mango Sorbet", removable: true },
        { name: "Coconut", removable: true },
      ],
      options: [
        { option: "Hot Fudge Drizzle", price: 1.0, enabled: true },
        { option: "Caramel Swirl", price: 0.75, enabled: true },
        { option: "Crushed Nuts", price: 1.5, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 6,
    categoryId: 0,
    image: "https://i.imgur.com/7j8av9M.png",
    price: 14.99,
    discount: 2.5,
    params: {
      title: "Salmon Poke Bowl",
      description:
        "Enjoy a delicious Salmon Poke Bowl, a refreshing combination of fresh salmon, rice, creamy avocado, black beans, and a medley of vibrant flavors. Customize your bowl with additional options to enhance your culinary experience.",
      quantity: "1 bowl",
      ingredients: [
        { name: "Fresh Salmon", removable: false },
        { name: "Sushi Rice", removable: false },
        { name: "Avocado", removable: true },
        { name: "Black Beans", removable: true },
        { name: "Cucumber Slices", removable: true },
        { name: "Seaweed Salad", removable: true },
      ],
      options: [
        { option: "Spicy Mayo Drizzle", price: 1.0, enabled: true },
        { option: "Soy Sauce Infusion", price: 0.75, enabled: true },
        { option: "Crunchy Tempura Bits", price: 1.5, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 7,
    categoryId: 0,
    image: "https://i.imgur.com/BV9AvXH.png",
    price: 14.99,
    discount: 2.5,
    params: {
      title: "Vegetarian Risotto",
      description:
        "Indulge in a flavorful vegetarian risotto, made with Arborio rice, a variety of fresh vegetables, and savory seasonings. This creamy and comforting dish is a perfect blend of textures and tastes.",
      quantity: "1 serving",
      ingredients: [
        { name: "Arborio Rice", removable: false },
        { name: "Vegetable Broth", removable: false },
        { name: "Mushrooms", removable: true },
        { name: "Asparagus", removable: true },
        { name: "Parmesan Cheese", removable: true },
        { name: "Fresh Thyme", removable: true },
      ],
      options: [
        { option: "Truffle Oil Drizzle", price: 2.0, enabled: true },
        { option: "Roasted Garlic", price: 1.5, enabled: true },
        { option: "Toasted Pine Nuts", price: 1.0, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 8,
    categoryId: 0,
    image: "https://i.imgur.com/2MBw7uY.png",
    price: 14.99,
    discount: 2.5,
    params: {
      title: "Chocolate Berry Pudding",
      description:
        "Indulge in a delightful sweet dish featuring rich chocolate, fresh blueberries, raspberries, strawberries, almonds, and wholesome oats. This decadent treat is a perfect blend of sweetness and crunch.",
      quantity: "1 serving",
      ingredients: [
        { name: "Rich Chocolate", removable: false },
        { name: "Blueberries", removable: true },
        { name: "Raspberries", removable: true },
        { name: "Strawberries", removable: true },
        { name: "Almonds", removable: true },
        { name: "Wholesome Oats", removable: true },
      ],
      options: [
        { option: "Caramel Drizzle", price: 1.5, enabled: true },
        { option: "Vanilla Ice Cream", price: 2.0, enabled: true },
        { option: "Toasted Coconut", price: 1.0, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 9,
    categoryId: 0,
    image: "https://i.imgur.com/OpFRcc8.png",
    price: 14.99,
    discount: 0,
    params: {
      title: "Beef Poke Bowl with an egg and",
      description:
        "Enjoy a flavorful poke bowl featuring tender beef, eggs, carrots, wakame seaweed, and rice. This delicious bowl is a perfect blend of protein, vegetables, and grains, providing a satisfying and nutritious meal.",
      quantity: "1 bowl",
      ingredients: [
        { name: "Tender Beef", removable: false },
        { name: "Eggs", removable: true },
        { name: "Carrots", removable: true },
        { name: "Wakame Seaweed", removable: true },
        { name: "Sushi Rice", removable: false },
      ],
      options: [
        { option: "Spicy Mayo Drizzle", price: 1.0, enabled: true },
        { option: "Soy Sauce Infusion", price: 0.75, enabled: true },
        { option: "Pickled Ginger", price: 0.5, enabled: true },
      ],
      available: true,
    },
  },

  {
    id: 10,
    categoryId: 1,
    image:
      "https://cdn.drawception.com/images/panels/2016/8-1/WeF3SSAbxq-3.png",
    price: 1337.99,
    discount: 0,
    params: {
      title: "Nichego tut netu",
      description: "Nu prjam voobshe nichego",
      quantity: "stickman butt",
      ingredients: [{ name: "Stickman", removable: false }],
      options: [{ option: "Extra stickman butt", price: 0, enabled: true }],
      available: true,
    },
  },
  {
    id: 11,
    categoryId: 2,
    image:
      "https://cdn.drawception.com/images/panels/2016/8-1/WeF3SSAbxq-3.png",
    price: 1337.99,
    discount: 0,
    params: {
      title: "Nichego tut netu",
      description: "Nu prjam voobshe nichego",
      quantity: "stickman butt",
      ingredients: [{ name: "Stickman", removable: false }],
      options: [{ option: "Extra stickman butt", price: 0, enabled: true }],
      available: true,
    },
  },
  {
    id: 12,
    categoryId: 3,
    image:
      "https://cdn.drawception.com/images/panels/2016/8-1/WeF3SSAbxq-3.png",
    price: 1337.99,
    discount: 0,
    params: {
      title: "Nichego tut netu",
      description: "Nu prjam voobshe nichego",
      quantity: "stickman butt",
      ingredients: [{ name: "Stickman", removable: false }],
      options: [{ option: "Extra stickman butt", price: 0, enabled: true }],
      available: true,
    },
  },
  {
    id: 13,
    categoryId: 4,
    image:
      "https://cdn.drawception.com/images/panels/2016/8-1/WeF3SSAbxq-3.png",
    price: 1337.99,
    discount: 0,
    params: {
      title: "Nichego tut netu",
      description: "Nu prjam voobshe nichego",
      quantity: "stickman butt",
      ingredients: [{ name: "Stickman", removable: false }],
      options: [{ option: "Extra stickman butt", price: 0, enabled: true }],
      available: true,
    },
  },
]

export const mockCategories: Category[] = [
  {
    id: 0,
    title: "Pizza",
  },
  {
    id: 1,
    title: "Pasta",
  },
  {
    id: 2,
    title: "Sushi",
  },
  {
    id: 3,
    title: "Drinks",
  },
  {
    id: 4,
    title: "Ramen",
  },
];


export const mockDishes1: Dish[] = [
  {
    id: 1,
    categoryId: 0,
    image: "https://t3.ftcdn.net/jpg/02/95/44/22/360_F_295442295_OXsXOmLmqBUfZreTnGo9PREuAPSLQhff.jpg",
    price: 500000.00,
    discount: 0,
    params: {
      title: "Ok this is seceond",
      description:
        "Fresh and healthy salad with grilled salmon. A delightful mix of greens, cherry tomatoes, cucumber, and avocado. Topped with perfectly grilled salmon fillet and drizzled with a zesty lemon vinaigrette.",
      quantity: "300g",
      ingredients: [
        { name: "Mixed Greens", removable: true },
        { name: "Cherry Tomatoes", removable: true },
        { name: "Cucumber", removable: true },
        { name: "Avocado", removable: true },
        { name: "Grilled Salmon", removable: true },
        { name: "Lemon Vinaigrette", removable: true },
      ],
      options: [
        { option: "Extra Dressing", price: 1.0, enabled: true },
        { option: "Croutons", price: 0.75, enabled: true },
        { option: "Gluten-Free", price: 2.5, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 2,
    categoryId: 0,
    image: "https://wallpapers.com/images/hd/funny-profile-picture-7k1legjukiz1lju7.jpg",
    price: 15722578.5,
    discount: 87879,
    params: {
      title: "Resto",
      description:
        "Creamy mashed potatoes made with butter and cream. A classic and comforting side dish that pairs well with a variety of main courses.",
      quantity: "200g",
      ingredients: [
        { name: "Potatoes", removable: false },
        { name: "Butter", removable: true },
        { name: "Cream", removable: true },
        { name: "Salt", removable: false },
        { name: "Chives", removable: true },
      ],
      options: [
        { option: "Extra Butter", price: 1.0, enabled: true },
        { option: "Garlic Infusion", price: 1.5, enabled: true },
        { option: "Cheese Topping", price: 1.25, enabled: true },
      ],
      available: true,
    },
  },
  {
    id: 3,
    categoryId: 0,
    image: "https://thumbs.dreamstime.com/b/funny-face-baby-27701492.jpg",
    price: 542378,
    discount: 4567,
    params: {
      title: "Dumplings",
      description:
        "Savor delicious dumplings with a perfect balance of flavors. These dumplings are filled with a delightful mixture of meat and vegetables, wrapped in a thin dough and steamed to perfection.",
      quantity: "~300g",
      ingredients: [
        { name: "Dumpling Dough", removable: false },
        { name: "Meat and Vegetable Filling", removable: true },
        { name: "Soy Sauce", removable: true },
        { name: "Ginger", removable: true },
        { name: "Green Onions", removable: true },
        { name: "Sesame Oil", removable: true },
      ],
      options: [
        { option: "Extra Soy Sauce", price: 0.75, enabled: true },
        { option: "Spicy Dipping Sauce", price: 1.0, enabled: true },
        { option: "Vegetarian Filling", price: 1.5, enabled: true },
      ],
      available: true,
    },
  }
]

export const mockCategories1: Category[] = [
  {
    id: 0,
    title: "Categoria",
  },
  {
    id: 1,
    title: "Categoria222",
  },
];