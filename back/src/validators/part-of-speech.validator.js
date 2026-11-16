import { body, param, query } from "express-validator";

const MAX_LABEL_LENGTH = 80;

const localeQuery = query("locale")
  .optional()
  .trim()
  .isLength({ min: 2, max: 20 })
  .matches(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
  .withMessage("The locale code is not valid.");

const codeParam = param("code")
  .trim()
  .isLength({ min: 1, max: MAX_LABEL_LENGTH })
  .withMessage("A part-of-speech code is required.");

const codeBody = body("code")
  .optional({ values: "falsy" })
  .trim()
  .isLength({ max: MAX_LABEL_LENGTH })
  .withMessage("The code must be at most 80 characters.");

/**
 * Labels arrive as `{ en: "noun", es: "sustantivo" }`. The service resolves the
 * locale rows, so this only checks the shape and the size limits.
 */
const translations = (required) => {
  const chain = body("translations");
  const base = required
    ? chain.exists().withMessage("Translations are required.")
    : chain.optional();

  return base
    .isObject()
    .withMessage("translations must be an object of locale/label pairs.")
    .custom((value) => {
      const entries = Object.entries(value ?? {});
      if (entries.length === 0) {
        throw new Error("Provide at least one translation label.");
      }

      for (const [locale, label] of entries) {
        if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(locale)) {
          throw new Error(`"${locale}" is not a valid locale code.`);
        }
        if (typeof label !== "string") {
          throw new Error(`The label for "${locale}" must be a string.`);
        }

        const trimmed = label.trim();
        if (!trimmed) {
          throw new Error(`The label for "${locale}" cannot be empty.`);
        }
        if (trimmed.length > MAX_LABEL_LENGTH) {
          throw new Error(
            `The label for "${locale}" must be at most ${MAX_LABEL_LENGTH} characters.`,
          );
        }
      }

      return true;
    });
};

const activeBody = body("isActive")
  .optional()
  .isBoolean()
  .withMessage("isActive must be true or false.")
  .toBoolean();

export const partOfSpeechReadValidator = [localeQuery];

export const partOfSpeechCreateValidator = [codeBody, translations(true)];

export const partOfSpeechUpdateValidator = [
  codeParam,
  translations(false),
  activeBody,
];

export const partOfSpeechCodeValidator = [codeParam];
