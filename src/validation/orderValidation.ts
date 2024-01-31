import Joi from "joi";
import { OrderItemStatuses, OrderStatuses } from "../types/order";
import { dishOptionSchema, ingredientSchema } from "./dishValidation";

export const customizedDishSchema = Joi.object({
  dishID: Joi.number().required(),
  removedIngredients: Joi.array().items(ingredientSchema).max(25),
  addedOptions: Joi.array().items(dishOptionSchema).max(25),
});

export const orderItemStatusSchema = Joi.string().valid(
  ...Object.keys(OrderItemStatuses)
);

export const orderItemSchema = Joi.object({
  id: Joi.string().required(),
  dish: customizedDishSchema.required(),
  amount: Joi.number().max(10).required(),
  status: orderItemStatusSchema.required(),
  price: Joi.object({
    price: Joi.number(),
    discount: Joi.number(),
    extras: Joi.number(),
    finalPrice: Joi.number(),
  }).allow(null),
});

export const orderStatusSchema = Joi.string().valid(
  ...Object.keys(OrderStatuses)
);

export const orderSchema = Joi.object({
  id: Joi.number().allow(null),
  time: Joi.number().allow(null),
  origin: Joi.number().required(),
  status: orderStatusSchema.required(),
  items: Joi.array().items(orderItemSchema).required(),
  note: Joi.string().max(150).allow("").required(),
  price: Joi.object({
    price: Joi.number(),
    discount: Joi.number(),
    extras: Joi.number(),
    finalPrice: Joi.number(),
  }).allow(null),
});
