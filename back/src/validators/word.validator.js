import { body, param, query } from "express-validator";
import { WORD_SORT_FIELDS } from "../models/word.model.js";

const wordId = param("id")
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage("Word id must be between 1 and 100 characters.");

const languageId = body("languageId")
  .trim()
  .isLength({ min: 1, max: 80 })
  .withMessage("languageId is required.");

const word = body("word")
  .trim()
  .isLength({ min: 1, max: 200 })
  .withMessage("Word must be between 1 and 200 characters.");

const translation = body("translation")
  .trim()
  .isLength({ min: 1, max: 300 })
  .withMessage("Translation must be between 1 and 300 characters.");

const pronunciation = body("pronunciation")
  .optional({ values: "falsy" })
  .trim()
  .isLength({ max: 200 })
  .withMessage("Pronunciation must be at most 200 characters.");

const partOfSpeech = body("partOfSpeech")
  .optional({ values: "falsy" })
  .trim()
  .isLength({ max: 80 })
  .withMessage("Part of speech must be at most 80 characters.");

const usage = body("usage")
  .optional({ values: "falsy" })
  .trim()
  .isLength({ max: 2000 })
  .withMessage("Usage must be at most 2000 characters.");

const page = query("page").optional().isInt({ min: 1 }).toInt();
const limit = query("limit").optional().isInt({ min: 1, max: 100 }).toInt();

const localeQuery = query("locale")
  .optional()
  .trim()
  .isLength({ min: 2, max: 20 })
  .matches(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
  .withMessage("The locale code is not valid.");

const localeParam = param("locale")
  .trim()
  .isLength({ min: 2, max: 20 })
  .withMessage("A locale code is required.")
  .matches(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
  .withMessage("The locale code is not valid.");

export const wordIdValidator = [wordId];

export const wordGetValidator = [wordId, localeQuery];

export const wordCreateValidator = [
  body("id")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 100 })
    .withMessage("Word id must be at most 100 characters."),
  languageId,
  word,
  translation,
  pronunciation,
  partOfSpeech,
  usage,
];

export const wordUpdateValidator = [
  wordId,
  body("languageId").optional().trim().isLength({ min: 1, max: 80 }),
  body("word").optional().trim().isLength({ min: 1, max: 200 }),
  body("translation").optional().trim().isLength({ min: 1, max: 300 }),
  body("pronunciation").optional({ values: "falsy" }).trim().isLength({ max: 200 }),
  body("partOfSpeech").optional({ values: "falsy" }).trim().isLength({ max: 80 }),
  body("usage").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),
  body().custom((_value, { req }) => {
    const allowed = [
      "languageId",
      "word",
      "translation",
      "pronunciation",
      "partOfSpeech",
      "usage",
    ];
    if (!allowed.some((field) => req.body[field] !== undefined)) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  }),
];

export const wordQueryValidator = [
  page,
  limit,
  localeQuery,
  query("q").optional().trim().isLength({ max: 200 }),
  query("languageId").optional().trim().isLength({ max: 80 }),
  query("partOfSpeech").optional().trim().isLength({ max: 80 }),
  query("verified").optional().isIn(["true", "false"]),
  query("sort").optional().isIn(Object.keys(WORD_SORT_FIELDS)),
  query("direction").optional().isIn(["asc", "desc"]),
];

export const wordListMineValidator = [page, limit];

export const wordDeleteValidator = [
  wordId,
  body("reason")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Reason must be at most 1000 characters."),
];

export const wordRestoreValidator = [wordId];

export const wordTranslationValidator = [
  wordId,
  localeParam,
  body("gloss")
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage("Translation must be between 1 and 300 characters."),
  body("usage")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Usage must be at most 2000 characters."),
];

export const wordTranslationDeleteValidator = [wordId, localeParam];
