/**
 * Shared content workflow vocabulary.
 *
 * Languages and words use the same moderation lifecycle, so the state names
 * live here rather than in either entity's model file.
 */
export const REVIEW_STATES = Object.freeze({
  // Contributor-owned, not yet submitted. Never visible to moderators.
  DRAFT: "draft",
  PENDING: "pending",
  REVIEWER_APPROVED: "reviewer_approved",
  APPROVED: "approved",
  REJECTED: "rejected",
  REMOVED: "removed",
});

export const REVIEW_STATE_VALUES = Object.freeze(Object.values(REVIEW_STATES));

export const REMOVAL_STATUSES = Object.freeze({
  PENDING: "pending",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
});

export const REMOVAL_STATUS_VALUES = Object.freeze(Object.values(REMOVAL_STATUSES));

/** Entity names used by the polymorphic audit/history tables. */
export const CONTENT_ENTITY_TYPES = Object.freeze({
  WORD: "word",
  LANGUAGE: "language",
});
