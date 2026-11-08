import { body } from "express-validator";

const email = body("email")
  .trim()
  .toLowerCase()
  .isEmail()
  .withMessage("Enter a valid email address.")
  .isLength({ max: 254 })
  .withMessage("Email is too long.");

const password = body("password")
  .isString()
  .withMessage("Password must be a string.")
  .isLength({ min: 8, max: 128 })
  .withMessage("Password must be between 8 and 128 characters.");

export const registerValidator = [
  body("username")
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Username must be between 2 and 60 characters."),
  email,
  password,
];

export const loginValidator = [email, password];
