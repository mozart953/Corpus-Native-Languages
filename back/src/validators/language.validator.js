import { body, param, query } from "express-validator";
import { LANGUAGE_STATUSES, LANGUAGE_SORT_FIELDS } from "../models/language.model.js";

const languageId = param("id")
  .trim()
  .isLength({ min: 1, max: 80 })
  .withMessage("Language id must be between 1 and 80 characters.")
  .matches(/^[a-z0-9-]+$/)
  .withMessage("Language id may only contain lowercase letters, numbers and hyphens.");

const idField = body("id")
  .optional({ values: "falsy" })
  .trim()
  .isLength({ min: 1, max: 80 })
  .withMessage("Language id must be between 1 and 80 characters.")
  .matches(/^[a-z0-9-]+$/)
  .withMessage("Language id may only contain lowercase letters, numbers and hyphens.");

const name = body("name")
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage("Name must be between 2 and 80 characters.");

const autonym = body("autonym")
  .trim()
  .isLength({ min: 1, max: 80 })
  .withMessage("Autonym must be between 1 and 80 characters.");

const region = body("region")
  .trim()
  .isLength({ min: 2, max: 200 })
  .withMessage("Region must be between 2 and 200 characters.");

const speakers = body("speakers")
  .isInt({ min: 0 })
  .withMessage("Speakers must be a non-negative integer.")
  .toInt();

const status = body("status")
  .optional()
  .isIn(LANGUAGE_STATUSES)
  .withMessage(`Status must be one of: ${LANGUAGE_STATUSES.join(", ")}.`);

const accent = body("accent")
  .optional()
  .matches(/^#[0-9a-fA-F]{6}$/)
  .withMessage("Accent must be a hex colour such as #2f8bff.");

const sort = query("sort")
  .optional()
  .isIn(Object.keys(LANGUAGE_SORT_FIELDS))
  .withMessage("Unknown sort field.");

const direction = query("direction")
  .optional()
  .isIn(["asc", "desc"])
  .withMessage("Direction must be asc or desc.");

const page = query("page").optional().isInt({ min: 1 }).toInt();
const limit = query("limit").optional().isInt({ min: 1, max: 100 }).toInt();

export const languageIdValidator = [languageId];

export const languageCreateValidator = [
  idField,
  name,
  autonym,
  region,
  speakers,
  status,
  accent,
];

export const languageUpdateValidator = [
  languageId,
  body("name").optional().trim().isLength({ min: 2, max: 80 }),
  body("autonym").optional().trim().isLength({ min: 1, max: 80 }),
  body("region").optional().trim().isLength({ min: 2, max: 200 }),
  body("speakers").optional().isInt({ min: 0 }).toInt(),
  body("status").optional().isIn(LANGUAGE_STATUSES),
  body("accent").optional().matches(/^#[0-9a-fA-F]{6}$/),
  body().custom((_value, { req }) => {
    const allowed = ["name", "autonym", "region", "speakers", "status", "accent"];
    if (!allowed.some((field) => req.body[field] !== undefined)) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  }),
];

export const languageQueryValidator = [
  page,
  limit,
  query("q").optional().trim().isLength({ max: 200 }),
  query("status").optional().isIn(LANGUAGE_STATUSES),
  sort,
  direction,
];

export const languageListMineValidator = [page, limit];

export const languageDeleteValidator = [
  languageId,
  body("reason")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Reason must be at most 1000 characters."),
];

export const languageRestoreValidator = [languageId];
