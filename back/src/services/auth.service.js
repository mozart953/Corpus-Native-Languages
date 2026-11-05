import { prisma } from "../config/database.js";
import { userRepository } from "../repositories/user.repository.js";
import { DEFAULT_PROVIDER, DEFAULT_ROLE, toPublicUser } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { auditService } from "./audit.service.js";

function normaliseEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

/**
 * Authentication is intentionally provider-aware. Today only `local` exists,
 * but an OAuth callback can later create a user with `provider: "google"` and
 * a null passwordHash, and this service will refuse password login for it.
 */
export const authService = {
  async register({ username, email, password }) {
    const normalisedEmail = normaliseEmail(email);

    const existing = await userRepository.findByEmail(normalisedEmail);
    if (existing) {
      throw ApiError.conflict("An account with that email already exists.");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await userRepository.create(
        {
          email: normalisedEmail,
          username: username.trim(),
          passwordHash,
          provider: DEFAULT_PROVIDER,
          role: DEFAULT_ROLE,
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "user",
          entityId: created.id,
          action: "registered",
          toState: created.role,
          actor: {
            id: created.id,
            email: created.email,
            role: created.role,
          },
          snapshot: toPublicUser(created),
        },
        tx,
      );

      return created;
    });

    return { data: toPublicUser(user) };
  },

  async login({ email, password }) {
    const normalisedEmail = normaliseEmail(email);
    const user = await userRepository.findByEmail(normalisedEmail);

    // One generic message for both unknown email and wrong password so the
    // endpoint does not reveal which accounts exist.
    if (!user) throw ApiError.unauthorized("Invalid email or password.");

    if (user.provider !== "local") {
      throw ApiError.unauthorized(
        `This account was created with the ${user.provider} provider. Use that provider to sign in.`,
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized("Invalid email or password.");

    await userRepository.markLogin(user.id);
    return { data: toPublicUser(user) };
  },

  async me(actor) {
    if (!actor) throw ApiError.unauthorized();
    const user = await userRepository.findById(actor.id);
    if (!user) throw ApiError.unauthorized("Your account no longer exists.");
    return { data: toPublicUser(user) };
  },
};
