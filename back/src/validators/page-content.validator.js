import { body, param } from "express-validator";

const localeParam = param("locale")
  .trim()
  .isLength({ min: 2, max: 20 })
  .withMessage("A locale code is required.")
  .matches(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
  .withMessage("The locale code is not valid.");

const keyParam = param("key")
  .trim()
  .isLength({ min: 1, max: 120 })
  .withMessage("A page-text key is required.");

const messages = body("messages")
  .isObject()
  .withMessage("messages must be an object of key/value pairs.")
  .custom((value) => {
    const entries = Object.entries(value ?? {});
    if (entries.length === 0) {
      throw new Error("Provide at least one page-text key.");
    }

    for (const [key, text] of entries) {
      if (key.length === 0 || key.length > 120) {
        throw new Error("Each page-text key must be between 1 and 120 characters.");
      }
      if (typeof text !== "string") {
        throw new Error(`The value for "${key}" must be a string.`);
      }
      if (text.length > 5000) {
        throw new Error(`The value for "${key}" must be 5000 characters or fewer.`);
      }
    }

    return true;
  });

export const pageContentReadValidator = [localeParam];

export const pageContentSaveValidator = [localeParam, messages];

export const pageContentResetValidator = [localeParam];

export const pageContentKeyResetValidator = [localeParam, keyParam];
