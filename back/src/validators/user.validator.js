import { body, param, query } from "express-validator";
import { APPROVAL_ROLES, ROLES, USER_STATUSES } from "../models/user.model.js";

export const userIdValidator = [
  param("id").trim().isLength({ min: 1, max: 100 }),
];

export const userRoleValidator = [
  ...userIdValidator,
  body("role")
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(", ")}.`),
];

export const userStatusValidator = [
  ...userIdValidator,
  body("status")
    .isIn(USER_STATUSES)
    .withMessage(`Status must be one of: ${USER_STATUSES.join(", ")}.`),
  body("role")
    .optional()
    .isIn(APPROVAL_ROLES)
    .withMessage(`Approval role must be one of: ${APPROVAL_ROLES.join(", ")}.`),
  body("reason")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Reason must be at most 500 characters."),
];

export const userListValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("role").optional().isIn(ROLES),
  query("status").optional().isIn(USER_STATUSES),
  query("q").optional().trim().isLength({ max: 200 }),
];
