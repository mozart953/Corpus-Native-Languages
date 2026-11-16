import { query } from "express-validator";

export const archiveListValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("type").optional().isIn(["all", "word", "language"]),
  query("q").optional().trim().isLength({ max: 200 }),
  query("locale")
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .matches(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
    .withMessage("The locale code is not valid."),
];
