import { prisma } from "../config/database.js";

export const reviewDecisionRepository = {
  create(data, client = prisma) {
    return client.reviewDecision.create({ data });
  },

  /**
   * Latest decision per entity. Rows are ordered newest-first, then reduced to
   * one entry per entity id, so callers can present derived rejection fields
   * without a query per row.
   */
  async findLatest(entityType, entityIds, client = prisma) {
    if (!entityIds.length) return [];

    const rows = await client.reviewDecision.findMany({
      where: { entityType, entityId: { in: entityIds } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    const seen = new Set();
    return rows.filter((row) => {
      if (seen.has(row.entityId)) return false;
      seen.add(row.entityId);
      return true;
    });
  },
};
