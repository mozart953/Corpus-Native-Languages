import { body } from "express-validator";

export const homeImageUpdateValidator = [
  body("alt")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Alt text must be text.")
    .trim()
    .isLength({ max: 200 })
    .withMessage("Alt text must be 200 characters or fewer."),
];
