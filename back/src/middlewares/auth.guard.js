import { readSession } from "../utils/session.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * The NextAuth JWT proves who signed in, but account state lives in the
 * database. Every authenticated request re-reads the user so:
 *   - deactivation and rejection take effect immediately,
 *   - role changes are applied without waiting for a new cookie,
 *   - deleted accounts stop working.
 */
async function resolveActiveUser(sessionUser) {
  if (!sessionUser) return { user: null, reason: "no_session" };

  const user = await userRepository.findById(sessionUser.id);
  if (!user) return { user: null, reason: "missing" };
  if (user.status !== "active") {
    return { user: null, reason: "inactive", status: user.status, statusReason: user.statusReason };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      provider: user.provider,
      status: user.status,
    },
    reason: null,
  };
}

function inactiveError(status, reason) {
  const messages = {
    pending: "Your account is waiting for admin approval.",
    rejected: "Your account registration was rejected.",
    deactivated: "Your account has been deactivated.",
  };

  return new ApiError(
    403,
    reason || messages[status] || "Your account is not active.",
    { code: `ACCOUNT_${String(status).toUpperCase()}` },
  );
}

/**
 * Attach `req.user` when a valid, active NextAuth cookie is present, but never
 * reject. Useful on public endpoints that show extra data to signed-in users.
 */
export function optionalAuth(req, _res, next) {
  readSession(req)
    .then(async (sessionUser) => {
      const { user } = await resolveActiveUser(sessionUser);
      if (user) req.user = user;
      next();
    })
    .catch(next);
}

export function requireAuth(req, _res, next) {
  readSession(req)
    .then(async (sessionUser) => {
      const { user, reason, status, statusReason } = await resolveActiveUser(sessionUser);

      if (reason === "inactive") throw inactiveError(status, statusReason);
      if (!user) throw ApiError.unauthorized("Your session is no longer valid. Please sign in again.");

      req.user = user;
      next();
    })
    .catch(next);
}
