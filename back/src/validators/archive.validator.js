import { query } from "express-validator";

export const archiveListValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("type").optional().isIn(["all", "word", "language"]),
  query("q").optional().trim().isLength({ max: 200 }),
];
