import { prisma } from "../config/database.js";
import { userRepository } from "../repositories/user.repository.js";
import { accountRequestRepository } from "../repositories/account-request.repository.js";
import {
  ACCOUNT_REQUEST_STATUSES,
  nextAllowedAt,
} from "../models/account.model.js";
import {
  presentAccount,
  toAccountRequest,
} from "../presenters/account.presenter.js";
import { toPublicUser } from "../presenters/user.presenter.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildMeta } from "../utils/pagination.js";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "../utils/password.js";
import { normalizeUsername } from "../utils/username.js";
import { auditService } from "./audit.service.js";

function normaliseEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function cooldownMessage(field, next) {
  const date = next.toISOString().slice(0, 10);
  return `You can change your ${field} again on ${date}.`;
}

function assertCooldown(user, field) {
  const next = nextAllowedAt(user[`${field}ChangedAt`], field);
  if (next && Date.now() < next.getTime()) {
    throw ApiError.conflict(cooldownMessage(field, next), {
      field,
      nextAllowedAt: next.toISOString(),
    });
  }
}

async function assertCurrentPassword(user, currentPassword) {
  if (!user.passwordHash) {
    throw ApiError.conflict("This account does not use a password.");
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest("The current password is not correct.");
  }
}

async function requireAccountUser(actor) {
  if (!actor) throw ApiError.unauthorized();
  const user = await userRepository.findById(actor.id);
  if (!user) throw ApiError.unauthorized("Your account no longer exists.");
  return user;
}

async function assertUniqueUsername(usernameKey, userId) {
  const existing = await userRepository.findByUsernameKey(usernameKey);
  if (existing && existing.id !== userId) {
    throw ApiError.conflict("That username is already taken by another account.");
  }
}

async function assertUniqueEmail(email, userId) {
  const existing = await userRepository.findByEmail(email);
  if (existing && existing.id !== userId) {
    throw ApiError.conflict("An account with that email already exists.");
  }
}

/**
 * Self-service account changes and the emergency request workflow.
 *
 * Cooldowns live on the User row (`usernameChangedAt`, etc.) so they survive
 * sign-outs and are shared by the self-service and admin-assisted paths. The
 * username key keeps uniqueness case-insensitive while the display name keeps
 * the capitalization the user chose.
 */
export const accountService = {
  async getAccount(actor) {
    const user = await requireAccountUser(actor);
    const requests = await accountRequestRepository.findManyByUserId(user.id);
    return { data: presentAccount(user, requests) };
  },

  async changeUsername({ username }, actor) {
    const user = await requireAccountUser(actor);
    const next = String(username ?? "").trim();

    if (next === user.username) {
      return { data: presentAccount(user) };
    }

    assertCooldown(user, "username");

    const usernameKey = normalizeUsername(next);
    await assertUniqueUsername(usernameKey, user.id);

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const row = await userRepository.updateProfile(
        user.id,
        { username: next, usernameKey, usernameChangedAt: now },
        tx,
      );

      await auditService.record(
        {
          entityType: "user",
          entityId: user.id,
          action: "account_username_changed",
          fromState: user.username,
          toState: next,
          actor,
          snapshot: toPublicUser(row),
        },
        tx,
      );

      return row;
    });

    return { data: presentAccount(updated) };
  },

  async changeEmail({ email, currentPassword }, actor) {
    const user = await requireAccountUser(actor);
    const next = normaliseEmail(email);

    if (next === user.email) {
      return { data: presentAccount(user) };
    }

    await assertCurrentPassword(user, currentPassword);
    assertCooldown(user, "email");
    await assertUniqueEmail(next, user.id);

    const updated = await prisma.$transaction(async (tx) => {
      // Verification is not enforced yet: the new address takes effect now and
      // is marked unverified. `pendingEmail` stays reserved for a later flow.
      const row = await userRepository.updateProfile(
        user.id,
        {
          email: next,
          emailChangedAt: new Date(),
          emailVerifiedAt: null,
          pendingEmail: null,
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "user",
          entityId: user.id,
          action: "account_email_changed",
          fromState: user.email,
          toState: next,
          actor,
          snapshot: toPublicUser(row),
        },
        tx,
      );

      return row;
    });

    return { data: presentAccount(updated) };
  },

  async changePassword({ currentPassword, newPassword }, actor) {
    const user = await requireAccountUser(actor);

    const policyError = validatePasswordStrength(newPassword);
    if (policyError) throw ApiError.badRequest(policyError);

    await assertCurrentPassword(user, currentPassword);
    assertCooldown(user, "password");

    const sameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
    if (sameAsCurrent) {
      throw ApiError.badRequest(
        "Choose a password different from your current password.",
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await prisma.$transaction(async (tx) => {
      const row = await userRepository.updateProfile(
        user.id,
        { passwordHash, passwordChangedAt: new Date() },
        tx,
      );

      await auditService.record(
        {
          entityType: "user",
          entityId: user.id,
          action: "account_password_changed",
          actor,
          snapshot: toPublicUser(row),
        },
        tx,
      );

      return row;
    });

    return { data: presentAccount(updated) };
  },

  async listOwnRequests(actor) {
    const user = await requireAccountUser(actor);
    const rows = await accountRequestRepository.findManyByUserId(user.id);
    return { data: rows.map(toAccountRequest) };
  },

  async createRequest({ reason, fields }, actor) {
    const user = await requireAccountUser(actor);
    const requested = [...new Set(fields ?? [])];

    if (requested.length === 0) {
      throw ApiError.badRequest("Choose at least one field that needs help.");
    }

    const open = await accountRequestRepository.findOpenByUserId(user.id);
    if (open) {
      throw ApiError.conflict(
        "You already have an open emergency request. Cancel it before opening another.",
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const row = await accountRequestRepository.create(
        {
          userId: user.id,
          reason: String(reason ?? "").trim(),
          requestUsername: requested.includes("username"),
          requestEmail: requested.includes("email"),
          requestPassword: requested.includes("password"),
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "accountRequest",
          entityId: row.id,
          action: "account_request_created",
          toState: ACCOUNT_REQUEST_STATUSES.PENDING,
          actor,
          reason: row.reason,
          snapshot: toAccountRequest(row),
        },
        tx,
      );

      return row;
    });

    return { data: toAccountRequest(created) };
  },

  async cancelRequest(id, actor) {
    const user = await requireAccountUser(actor);
    const request = await accountRequestRepository.findById(id);

    if (!request || request.userId !== user.id) {
      throw ApiError.notFound("Emergency request not found.");
    }
    if (request.statusCode !== ACCOUNT_REQUEST_STATUSES.PENDING) {
      throw ApiError.conflict("Only a pending request can be cancelled.");
    }

    const resolved = await prisma.$transaction(async (tx) => {
      const row = await accountRequestRepository.resolve(
        request.id,
        {
          statusCode: ACCOUNT_REQUEST_STATUSES.CANCELLED,
          resolvedById: user.id,
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "accountRequest",
          entityId: request.id,
          action: "account_request_cancelled",
          fromState: ACCOUNT_REQUEST_STATUSES.PENDING,
          toState: ACCOUNT_REQUEST_STATUSES.CANCELLED,
          actor,
          snapshot: toAccountRequest(row),
        },
        tx,
      );

      return row;
    });

    return { data: toAccountRequest(resolved) };
  },

  async listRequests({ page, limit, status, q } = {}, actor) {
    if (!actor || actor.role !== "admin") {
      throw ApiError.forbidden("Only an admin can review emergency requests.");
    }

    const pagination = getPagination({ page, limit });
    const where = {};

    if (status) where.statusCode = status;
    if (q) {
      where.user = {
        OR: [
          { username: { contains: q } },
          { email: { contains: q } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      accountRequestRepository.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
      }),
      accountRequestRepository.count(where),
    ]);

    return {
      data: rows.map(toAccountRequest),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  /**
   * Admin-assisted edit. The target must have an open emergency request, and
   * only the fields named in that request may be changed. The edit resolves the
   * request and starts a fresh cooldown for every field it touched.
   */
  async adminUpdateUser(id, { username, email, password, resolutionNote }, actor) {
    if (!actor || actor.role !== "admin") {
      throw ApiError.forbidden("Only an admin can change another account.");
    }
    if (id === actor.id) {
      throw ApiError.conflict(
        "Use the account page to change your own details.",
      );
    }

    const target = await userRepository.findById(id);
    if (!target) throw ApiError.notFound("User not found.");

    const open = await accountRequestRepository.findOpenByUserId(id);
    if (!open) {
      throw ApiError.conflict(
        "This account has no open emergency request, so an admin cannot edit it.",
      );
    }

    const data = {};
    const changedFields = [];
    const now = new Date();

    if (username !== undefined && username !== "") {
      if (!open.requestUsername) {
        throw ApiError.badRequest(
          "The request does not cover a username change.",
        );
      }

      const next = String(username).trim();
      if (next !== target.username) {
        const usernameKey = normalizeUsername(next);
        await assertUniqueUsername(usernameKey, target.id);
        data.username = next;
        data.usernameKey = usernameKey;
        data.usernameChangedAt = now;
        changedFields.push("username");
      }
    }

    if (email !== undefined && email !== "") {
      if (!open.requestEmail) {
        throw ApiError.badRequest("The request does not cover an email change.");
      }

      const next = normaliseEmail(email);
      if (next !== target.email) {
        await assertUniqueEmail(next, target.id);
        data.email = next;
        data.emailChangedAt = now;
        data.emailVerifiedAt = null;
        data.pendingEmail = null;
        changedFields.push("email");
      }
    }

    if (password !== undefined && password !== "") {
      if (!open.requestPassword) {
        throw ApiError.badRequest(
          "The request does not cover a password change.",
        );
      }

      const policyError = validatePasswordStrength(password);
      if (policyError) throw ApiError.badRequest(policyError);

      data.passwordHash = await hashPassword(password);
      data.passwordChangedAt = now;
      changedFields.push("password");
    }

    if (changedFields.length === 0) {
      throw ApiError.badRequest("No account details were changed.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await userRepository.updateProfile(id, data, tx);

      const resolved = await accountRequestRepository.resolve(
        open.id,
        {
          statusCode: ACCOUNT_REQUEST_STATUSES.COMPLETED,
          resolvedById: actor.id,
          resolutionNote,
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "user",
          entityId: id,
          action: "account_emergency_changed",
          fromState: ACCOUNT_REQUEST_STATUSES.PENDING,
          toState: ACCOUNT_REQUEST_STATUSES.COMPLETED,
          actor,
          reason: resolutionNote || open.reason,
          snapshot: {
            ...toPublicUser(row),
            requestId: open.id,
            requestReason: open.reason,
            changedFields,
          },
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "accountRequest",
          entityId: open.id,
          action: "account_request_completed",
          fromState: ACCOUNT_REQUEST_STATUSES.PENDING,
          toState: ACCOUNT_REQUEST_STATUSES.COMPLETED,
          actor,
          reason: resolutionNote || open.reason,
          snapshot: toAccountRequest(resolved),
        },
        tx,
      );

      return row;
    });

    return { data: toPublicUser(updated) };
  },
};
