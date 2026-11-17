import { body, param, query } from "express-validator";
import {
  ACCOUNT_CHANGE_FIELDS,
  ACCOUNT_REQUEST_STATUS_LIST,
} from "../models/account.model.js";
import { validatePasswordStrength } from "../utils/password.js";

const currentPassword = body("currentPassword")
  .isString()
  .withMessage("Enter your current password.")
  .isLength({ min: 1, max: 128 })
  .withMessage("Enter your current password.");

const username = body("username")
  .trim()
  .isLength({ min: 2, max: 60 })
  .withMessage("Username must be between 2 and 60 characters.");

const email = body("email")
  .trim()
  .toLowerCase()
  .isEmail()
  .withMessage("Enter a valid email address.")
  .isLength({ max: 254 })
  .withMessage("Email is too long.");

const strongPassword = (field) =>
  body(field)
    .isString()
    .withMessage("Password must be a string.")
    .custom((value) => {
      const message = validatePasswordStrength(value);
      if (message) throw new Error(message);
      return true;
    });

export const accountUsernameValidator = [username];

export const accountEmailValidator = [email, currentPassword];

export const accountPasswordValidator = [
  currentPassword,
  strongPassword("newPassword"),
];

export const accountRequestCreateValidator = [
  body("reason")
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage("Explain the problem in 5 to 500 characters."),
  body("fields")
    .isArray({ min: 1, max: ACCOUNT_CHANGE_FIELDS.length })
    .withMessage("Choose at least one field that needs help."),
  body("fields.*").isIn(ACCOUNT_CHANGE_FIELDS).withMessage("Unknown field."),
];

export const accountRequestListValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("status").optional().isIn(ACCOUNT_REQUEST_STATUS_LIST),
  query("q").optional().trim().isLength({ max: 200 }),
];

export const accountRequestIdValidator = [
  param("id").trim().isLength({ min: 1, max: 100 }),
];

export const adminAccountUpdateValidator = [
  param("id").trim().isLength({ min: 1, max: 100 }),
  body("username")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Username must be between 2 and 60 characters."),
  body("email")
    .optional({ values: "falsy" })
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Enter a valid email address.")
    .isLength({ max: 254 })
    .withMessage("Email is too long."),
  body("password")
    .optional({ values: "falsy" })
    .isString()
    .withMessage("Password must be a string.")
    .custom((value) => {
      const message = validatePasswordStrength(value);
      if (message) throw new Error(message);
      return true;
    }),
  body("resolutionNote")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("The note must be at most 500 characters."),
];
