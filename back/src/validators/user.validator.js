import { body, param, query } from "express-validator";
import { ROLES } from "../models/user.model.js";

export const userIdValidator = [
  param("id").trim().isLength({ min: 1, max: 100 }),
];

export const userRoleValidator = [
  ...userIdValidator,
  body("role")
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(", ")}.`),
];

export const userListValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("role").optional().isIn(ROLES),
  query("q").optional().trim().isLength({ max: 200 }),
];
