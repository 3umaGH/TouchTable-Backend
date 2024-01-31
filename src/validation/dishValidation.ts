import Joi from "joi";

export const ingredientSchema = Joi.object({
  name: Joi.string().max(50).required(),
  removable: Joi.boolean().required(),
});

export const dishOptionSchema = Joi.object({
  option: Joi.string().max(30).required(),
  price: Joi.number().required(),
  enabled: Joi.boolean().required(),
});

export const dishSchema = Joi.object({
  id: Joi.number().integer().required(),
  categoryId: Joi.number().integer().min(0).max(100).required(),
  image: Joi.string().max(150).required(),
  price: Joi.number().min(0).max(10000).required(),
  discount: Joi.number().min(0).max(100).required(),
  params: Joi.object({
    title: Joi.string().max(60).required(),
    description: Joi.string().max(600).required(),
    quantity: Joi.string().max(30).required(),
    ingredients: Joi.array().items(ingredientSchema).min(1).max(30).required(),
    options: Joi.array().items(dishOptionSchema).max(30).required(),
    available: Joi.boolean().required(),
  }).required(),
});

export const unverifiedDishSchema = dishSchema.fork(["id"], (schema) =>
  schema.allow(null)
);
