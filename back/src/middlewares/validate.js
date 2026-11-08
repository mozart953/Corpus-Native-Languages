import { validationResult, matchedData } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

/**
 * Turn express-validator results into a consistent 422 payload and expose the
 * sanitised values as `req.validated`. Services never read raw `req.body`.
 */
export function validate(req, _res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const details = result.array().map((issue) => ({
      field: issue.path,
      location: issue.location,
      message: issue.msg,
    }));

    return next(ApiError.unprocessable("Validation failed.", details));
  }

  // Only fields that were actually supplied are returned, so PATCH-style
  // updates cannot accidentally clear optional columns.
  req.validated = matchedData(req, {
    locations: ["body", "query", "params"],
  });

  next();
}
