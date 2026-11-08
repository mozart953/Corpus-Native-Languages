import { prisma } from "../config/database.js";
import { userRepository } from "../repositories/user.repository.js";
import {
  APPROVAL_ROLES,
  isValidRole,
  isValidStatus,
  toPublicUser,
} from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildMeta } from "../utils/pagination.js";
import { auditService } from "./audit.service.js";

const ALLOWED_TRANSITIONS = {
  pending: ["active", "rejected"],
  rejected: ["active"],
  active: ["deactivated"],
  deactivated: ["active"],
};

async function assertNotLastActiveAdmin(target) {
  if (target.role !== "admin" || target.status !== "active") return;

  const activeAdmins = await userRepository.count({ role: "admin", status: "active" });
  if (activeAdmins <= 1) {
    throw ApiError.conflict("The last active admin cannot be deactivated or demoted.");
  }
}

async function recordStatusChange(user, target, actor, reason, client) {
  const action =
    user.status === "active"
      ? target.status === "deactivated"
        ? "account_reactivated"
        : "account_approved"
      : user.status === "rejected"
        ? "account_rejected"
        : "account_deactivated";

  await auditService.record(
    {
      entityType: "user",
      entityId: user.id,
      action,
      fromState: target.status,
      toState: user.status,
      actor,
      reason: reason ?? null,
      snapshot: toPublicUser(user),
    },
    client,
  );
}

export const userService = {
  async list({ page, limit, role, status, q } = {}) {
    const pagination = getPagination({ page, limit });
    const where = {};

    if (role) where.role = role;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { username: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      userRepository.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      userRepository.count(where),
    ]);

    return {
      data: rows.map(toPublicUser),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async updateRole(id, role, actor) {
    if (!actor || actor.role !== "admin") {
      throw ApiError.forbidden("Only an admin can change roles.");
    }
    if (!isValidRole(role)) {
      throw ApiError.badRequest("Unknown role.");
    }

    const target = await userRepository.findById(id);
    if (!target) throw ApiError.notFound("User not found.");
    if (target.status !== "active") {
      throw ApiError.conflict("Approve the account before changing its role.");
    }

    if (target.role === "admin" && role !== "admin") {
      await assertNotLastActiveAdmin(target);
    }

    if (target.role === role) {
      return { data: toPublicUser(target) };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await userRepository.updateRole(id, role, tx);

      await auditService.record(
        {
          entityType: "user",
          entityId: id,
          action: "role_changed",
          fromState: target.role,
          toState: role,
          actor,
          snapshot: toPublicUser(user),
        },
        tx,
      );

      return user;
    });

    return { data: toPublicUser(updated) };
  },

  /**
   * Approve, reject, deactivate or reactivate an account. Approval grants a
   * contributor or reviewer role; admin remains a later promotion.
   */
  async updateStatus(id, { status, role, reason }, actor) {
    if (!actor || actor.role !== "admin") {
      throw ApiError.forbidden("Only an admin can change account status.");
    }
    if (!isValidStatus(status)) {
      throw ApiError.badRequest("Unknown account status.");
    }
    if (id === actor.id) {
      throw ApiError.conflict("You cannot change the status of your own account.");
    }

    const target = await userRepository.findById(id);
    if (!target) throw ApiError.notFound("User not found.");

    if (target.status === status && !role) {
      return { data: toPublicUser(target) };
    }

    const allowed = ALLOWED_TRANSITIONS[target.status] ?? [];
    if (target.status !== status && !allowed.includes(status)) {
      throw ApiError.conflict(
        `An account cannot move from "${target.status}" to "${status}".`,
      );
    }

    let nextRole = target.role;
    if (status === "active" && target.status !== "active") {
      if (role !== undefined) {
        if (!APPROVAL_ROLES.includes(role)) {
          throw ApiError.badRequest(
            `Approval role must be one of: ${APPROVAL_ROLES.join(", ")}.`,
          );
        }
        nextRole = role;
      } else if (target.status === "deactivated") {
        // Reactivation keeps the role the account had before it was paused.
        nextRole = target.role;
      } else if (target.role === "admin") {
        nextRole = "admin";
      } else {
        nextRole = "contributor";
      }
    } else if (role !== undefined) {
      throw ApiError.badRequest("A role can only be assigned when activating an account.");
    }

    if (target.role === "admin" && (status !== "active" || nextRole !== "admin")) {
      await assertNotLastActiveAdmin(target);
    }

    const now = new Date();
    const activating = status === "active";
    const data = {
      status,
      role: nextRole,
      statusReason: activating ? null : reason ?? null,
      statusChangedAt: now,
      ...(activating
        ? {
            approvedAt: target.approvedAt ?? now,
            approvedById: target.approvedById ?? actor.id,
          }
        : {}),
    };

    const updated = await prisma.$transaction(async (tx) => {
      const user = await userRepository.updateStatus(id, data, tx);
      await recordStatusChange(user, target, actor, reason, tx);
      return user;
    });

    return { data: toPublicUser(updated) };
  },
};
