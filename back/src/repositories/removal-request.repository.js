import { prisma } from "../config/database.js";
import { REMOVAL_STATUSES } from "../models/content.model.js";

export const removalRequestRepository = {
  create(data, client = prisma) {
    return client.removalRequest.create({ data });
  },

  findMany({ where = {}, orderBy = { createdAt: "asc" }, skip, take } = {}, client = prisma) {
    return client.removalRequest.findMany({ where, orderBy, skip, take });
  },

  count(where = {}, client = prisma) {
    return client.removalRequest.count({ where });
  },

  async findLatestPending(entityType, entityIds, client = prisma) {
    if (!entityIds.length) return [];

    const rows = await client.removalRequest.findMany({
      where: {
        entityType,
        entityId: { in: entityIds },
        statusCode: REMOVAL_STATUSES.PENDING,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const seen = new Set();
    return rows.filter((row) => {
      if (seen.has(row.entityId)) return false;
      seen.add(row.entityId);
      return true;
    });
  },

  findPendingForEntity(entityType, entityId, client = prisma) {
    return client.removalRequest.findFirst({
      where: {
        entityType,
        entityId,
        statusCode: REMOVAL_STATUSES.PENDING,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  },

  resolvePending(entityType, entityId, { statusCode, resolvedById }, client = prisma) {
    return client.removalRequest.updateMany({
      where: {
        entityType,
        entityId,
        statusCode: REMOVAL_STATUSES.PENDING,
      },
      data: {
        statusCode,
        resolvedById: resolvedById ?? null,
        resolvedAt: new Date(),
      },
    });
  },
};
