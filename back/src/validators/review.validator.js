import { body, query } from "express-validator";

export const reviewValidator = [
  body("decision")
    .isIn(["approve", "reject"])
    .withMessage("Decision must be approve or reject."),
  body("comment")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment must be at most 1000 characters."),
];

export const reviewQueueValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("type").optional().isIn(["all", "word", "language"]),
  query("languageId").optional().trim().isLength({ max: 80 }),
];

export const reviewHistoryValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("entityType").optional().isIn(["word", "language", "user", "system"]),
  query("entityId").optional().trim().isLength({ max: 100 }),
  query("action")
    .optional()
    .isIn([
      "registered",
      "role_changed",
      "created_approved",
      "submitted",
      "updated",
      "updated_pending",
      "reviewer_approved",
      "approved",
      "rejected",
      "removed",
      "restored",
      "seeded",
    ]),
];
