import { reviewDecisionRepository } from "../repositories/review-decision.repository.js";
import { removalRequestRepository } from "../repositories/removal-request.repository.js";

/**
 * Attaches the latest review decision and pending removal request to content
 * rows so presenters can derive rejection/removal fields without storing those
 * values twice.
 */
export const contentHistory = {
  async decorate(entityType, rows, client) {
    if (!rows.length) return rows;

    const ids = rows.map((row) => row.id);
    const [decisions, removals] = await Promise.all([
      reviewDecisionRepository.findLatest(entityType, ids, client),
      removalRequestRepository.findLatestPending(entityType, ids, client),
    ]);

    const decisionById = new Map(decisions.map((row) => [row.entityId, row]));
    const removalById = new Map(removals.map((row) => [row.entityId, row]));

    return rows.map((row) => ({
      ...row,
      latestDecision: decisionById.get(row.id) ?? null,
      latestRemovalRequest: removalById.get(row.id) ?? null,
    }));
  },

  async decorateOne(entityType, row, client) {
    const [decorated] = await this.decorate(entityType, [row], client);
    return decorated;
  },

  recordDecision({ entityType, entityId, stateCode, reviewerId = null, comment = null }, client) {
    return reviewDecisionRepository.create(
      {
        entityType,
        entityId,
        stateCode,
        reviewerId,
        comment,
      },
      client,
    );
  },
};
