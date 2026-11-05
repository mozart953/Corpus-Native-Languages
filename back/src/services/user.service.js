import { prisma } from "../config/database.js";
import { userRepository } from "../repositories/user.repository.js";
import { isValidRole, toPublicUser } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildMeta } from "../utils/pagination.js";
import { auditService } from "./audit.service.js";

export const userService = {
  async list({ page, limit, role, q } = {}) {
    const pagination = getPagination({ page, limit });
    const where = {};

    if (role) where.role = role;
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { username: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      userRepository.findMany({
        where,
        orderBy: { createdAt: "desc" },
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

    if (target.role === "admin" && role !== "admin") {
      const adminCount = await userRepository.count({ role: "admin" });
      if (adminCount <= 1) {
        throw ApiError.conflict("The last admin cannot be demoted.");
      }
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
};
