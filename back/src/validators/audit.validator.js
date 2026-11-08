import { query } from "express-validator";

export const auditListValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("entityType").optional().isIn(["word", "language", "user", "system"]),
  query("entityId").optional().trim().isLength({ max: 100 }),
  query("action").optional().trim().isLength({ max: 60 }),
];
