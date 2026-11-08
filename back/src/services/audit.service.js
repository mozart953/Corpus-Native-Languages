import { auditRepository } from "../repositories/audit.repository.js";
import { getPagination, buildMeta } from "../utils/pagination.js";

/**
 * The audit log is the durable record of every moderation decision. For a
 * logical delete it is the table that still contains the removed content and
 * the date it was removed, even after the entity stops appearing in the app.
 */
export const auditService = {
  record(
    {
      entityType,
      entityId,
      action,
      fromState = null,
      toState = null,
      actor = null,
      reason = null,
      snapshot = null,
    },
    client,
  ) {
    return auditRepository.create(
      {
        entityType,
        entityId,
        action,
        fromState,
        toState,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        actorRole: actor?.role ?? null,
        reason,
        snapshot: snapshot ? JSON.stringify(snapshot) : null,
      },
      client,
    );
  },

  async list({ page, limit, entityType, entityId, action } = {}) {
    const pagination = getPagination({ page, limit });
    const where = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;

    const [rows, total] = await Promise.all([
      auditRepository.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: "desc" },
      }),
      auditRepository.count(where),
    ]);

    const data = rows.map((row) => {
      let snapshot = null;
      if (row.snapshot) {
        try {
          snapshot = JSON.parse(row.snapshot);
        } catch {
          snapshot = row.snapshot;
        }
      }
      return { ...row, snapshot };
    });

    return {
      data,
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },
};
