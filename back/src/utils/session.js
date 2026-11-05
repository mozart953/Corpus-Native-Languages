import { decode } from "@auth/core/jwt";
import { env } from "../config/env.js";

/**
 * NextAuth stores an encrypted JWT in an HTTP-only cookie. Express does not
 * run NextAuth, but it shares AUTH_SECRET with the Next.js app, so it can
 * decode that cookie and trust the same session.
 *
 * Auth.js salts the JWT with the cookie name. We try the configured name and
 * the `__Secure-` variant so the guard works in development and production.
 */
function getCookieCandidates() {
  const name = env.authCookieName;
  return [...new Set([name, `__Secure-${name}`])];
}

export async function readSession(req) {
  const cookies = req.cookies ?? {};

  for (const cookieName of getCookieCandidates()) {
    const token = cookies[cookieName];
    if (!token) continue;

    try {
      const payload = await decode({
        token,
        secret: env.authSecret,
        salt: cookieName,
      });

      if (!payload) continue;
      if (payload.exp && payload.exp * 1000 <= Date.now()) return null;

      const id = payload.id ?? payload.sub;
      if (!id) continue;

      return {
        id,
        email: payload.email ?? null,
        username: payload.username ?? payload.name ?? null,
        role: payload.role ?? "contributor",
        provider: payload.provider ?? "local",
      };
    } catch {
      // Try the next candidate; a stale cookie should never crash the API.
    }
  }

  return null;
}
