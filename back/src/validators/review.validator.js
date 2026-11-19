import { body, query } from "express-validator";

const localeQuery = query("locale")
  .optional()
  .trim()
  .isLength({ min: 2, max: 20 })
  .matches(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
  .withMessage("The locale code is not valid.");

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
  localeQuery,
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
      "account_approved",
      "account_rejected",
      "account_deactivated",
      "account_reactivated",
      "account_status_changed",
      "draft_created",
      "created_approved",
      "created_reviewer_approved",
      "submitted",
      "updated",
      "updated_pending",
      "draft_discarded",
      "draft_restored",
      "reviewer_approved",
      "approved",
      "rejected",
      "removal_requested",
      "removal_request_cancelled",
      "removed",
      "restored",
      "seeded",
    ]),
];
