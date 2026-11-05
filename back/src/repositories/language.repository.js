import { prisma } from "../config/database.js";
import { REVIEW_STATES } from "../models/language.model.js";

/**
 * Data access for Language. Repositories only build Prisma queries; business
 * rules (who may edit, what state comes next) live in the service layer.
 *
 * Every method accepts an optional transaction client so a service can group
 * an entity write and its audit entry atomically.
 */
export const languageRepository = {
  findMany({ where = {}, orderBy = { name: "asc" }, skip, take } = {}, client = prisma) {
    return client.language.findMany({ where, orderBy, skip, take });
  },

  count(where = {}, client = prisma) {
    return client.language.count({ where });
  },

  findById(id, client = prisma) {
    return client.language.findUnique({ where: { id } });
  },

  findBySlug(id, client = prisma) {
    return client.language.findUnique({ where: { id } });
  },

  create(data, client = prisma) {
    return client.language.create({ data });
  },

  update(id, data, client = prisma) {
    return client.language.update({ where: { id }, data });
  },

  softDelete(id, { deletedById, reason }, client = prisma) {
    return client.language.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: deletedById ?? null,
        deletionReason: reason ?? null,
        reviewState: REVIEW_STATES.REMOVED,
        verified: false,
      },
    });
  },

  restore(id, client = prisma) {
    return client.language.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
        deletionReason: null,
        reviewState: REVIEW_STATES.PENDING,
        verified: false,
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });
  },
};
