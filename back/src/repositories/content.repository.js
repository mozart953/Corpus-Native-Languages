import { prisma } from "../config/database.js";
import { REVIEW_STATES } from "../models/content.model.js";

/**
 * Repository factory for content tables that share the moderation workflow.
 *
 * Repositories only build Prisma queries. Business rules live in the service
 * layer. Every method accepts an optional transaction client so a service can
 * group an entity write with its history and audit entries atomically.
 *
 * `delegate` is the Prisma model name (`word` or `language`); `include` is the
 * entity-specific read shape used by its presenter.
 */
export function createContentRepository({ delegate, include = {}, defaultOrderBy = { createdAt: "desc" } }) {
  const model = (client) => client[delegate];

  return {
    findMany({ where = {}, orderBy = defaultOrderBy, skip, take } = {}, client = prisma) {
      return model(client).findMany({ where, orderBy, skip, take, include });
    },

    findByIds(ids, client = prisma) {
      if (!ids.length) return Promise.resolve([]);
      return model(client).findMany({ where: { id: { in: ids } }, include });
    },

    count(where = {}, client = prisma) {
      return model(client).count({ where });
    },

    findById(id, client = prisma) {
      return model(client).findUnique({ where: { id }, include });
    },

    create(data, client = prisma) {
      return model(client).create({ data, include });
    },

    update(id, data, client = prisma) {
      return model(client).update({ where: { id }, data, include });
    },

    softDelete(id, { deletedById, reason }, client = prisma) {
      return model(client).update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: deletedById ?? null,
          deletionReason: reason ?? null,
          reviewStateCode: REVIEW_STATES.REMOVED,
        },
        include,
      });
    },

    restore(id, client = prisma) {
      return model(client).update({
        where: { id },
        data: {
          deletedAt: null,
          deletedById: null,
          deletionReason: null,
          reviewStateCode: REVIEW_STATES.PENDING,
        },
        include,
      });
    },

    // A contributor moving their own draft to the private trash keeps the draft
    // state so it is never confused with admin-removed content.
    discardDraft(id, { deletedById, reason }, client = prisma) {
      return model(client).update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: deletedById ?? null,
          deletionReason: reason ?? null,
        },
        include,
      });
    },

    restoreDraft(id, client = prisma) {
      return model(client).update({
        where: { id },
        data: {
          deletedAt: null,
          deletedById: null,
          deletionReason: null,
        },
        include,
      });
    },
  };
}
