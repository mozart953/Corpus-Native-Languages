import { readSession } from "../utils/session.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Attach `req.user` when a valid NextAuth cookie is present, but never reject.
 * Useful on public endpoints that show extra data to signed-in reviewers.
 */
export function optionalAuth(req, _res, next) {
  readSession(req)
    .then((user) => {
      if (user) req.user = user;
      next();
    })
    .catch(next);
}

export function requireAuth(req, _res, next) {
  readSession(req)
    .then((user) => {
      if (!user) return next(ApiError.unauthorized());
      req.user = user;
      next();
    })
    .catch(next);
}
