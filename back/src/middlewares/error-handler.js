import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export function notFound(req, _res, next) {
  next(
    new ApiError(
      404,
      `Route ${req.method} ${req.originalUrl} does not exist.`,
      { code: "ROUTE_NOT_FOUND" },
    ),
  );
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "An unexpected error occurred.";
  let details;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = 409;
      code = "CONFLICT";
      message = "A record with that unique value already exists.";
    } else if (error.code === "P2003") {
      statusCode = 409;
      code = "RELATION_CONFLICT";
      message = "A related record does not exist or is still in use.";
    } else if (error.code === "P2025") {
      statusCode = 404;
      code = "NOT_FOUND";
      message = "The requested record does not exist.";
    } else if (error.code === "P2014") {
      statusCode = 409;
      code = "RELATION_CONFLICT";
      message = "That change would break a required relation.";
    }
  } else if (error.type === "entity.parse.failed") {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "The request body is not valid JSON.";
  } else if (error.type === "entity.too.large") {
    statusCode = 413;
    code = "BODY_TOO_LARGE";
    message = "The request body is too large.";
  } else if (error.name === "MulterError") {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    code = error.code === "LIMIT_FILE_SIZE" ? "IMAGE_TOO_LARGE" : "UPLOAD_ERROR";
    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "That image is larger than the 5 MB limit."
        : "The image upload could not be accepted.";
  } else if (error.message === "Not allowed by CORS") {
    statusCode = 403;
    code = "CORS_FORBIDDEN";
    message = "This origin is not allowed to call the API.";
  }

  if (statusCode >= 500) {
    console.error("[api:error]", error);
  }

  const body = {
    error: {
      code,
      message,
    },
  };

  if (details) body.error.details = details;

  // Never leak stack traces or driver internals in production.
  if (!env.isProduction && statusCode >= 500) {
    body.error.debug = error.message;
  }

  res.status(statusCode).json(body);
}
