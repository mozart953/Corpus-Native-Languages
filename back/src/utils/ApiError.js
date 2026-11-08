/**
 * Error type understood by the central error handler.
 *
 * Controllers and services throw these instead of writing responses directly,
 * which keeps the HTTP concern in one place.
 */
export class ApiError extends Error {
  constructor(statusCode, message, { code = "REQUEST_ERROR", details } = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = statusCode < 500;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, { code: "BAD_REQUEST", details });
  }

  static unauthorized(message = "Authentication is required.") {
    return new ApiError(401, message, { code: "UNAUTHORIZED" });
  }

  static forbidden(message = "You do not have permission to do that.") {
    return new ApiError(403, message, { code: "FORBIDDEN" });
  }

  static notFound(message = "Resource not found.") {
    return new ApiError(404, message, { code: "NOT_FOUND" });
  }

  static conflict(message, details) {
    return new ApiError(409, message, { code: "CONFLICT", details });
  }

  static unprocessable(message, details) {
    return new ApiError(422, message, { code: "VALIDATION_ERROR", details });
  }

  static tooManyRequests(message = "Too many requests. Try again later.") {
    return new ApiError(429, message, { code: "RATE_LIMITED" });
  }
}
