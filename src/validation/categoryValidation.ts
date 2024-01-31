import Joi from "joi";

export const categorySchema = Joi.object({
  id: Joi.number().integer().required(),
  title: Joi.string().max(30).required(),
});

export const DraftCategorySchema = categorySchema.fork(["id"], (schema) =>
  schema.allow(null)
);
