export const LANGUAGE_STATUSES = Object.freeze([
  "active",
  "endangered",
  "critically-endangered",
]);

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

export const LANGUAGE_SORT_FIELDS = Object.freeze({
  name: "name",
  speakers: "speakers",
  words: "words",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
});

/**
 * Public representation of a language. Request-level metadata such as the
 * acting user's id stays out of the response; the review state is included so
 * reviewers and the frontend can explain why an entry is (not) visible.
 */
export function toLanguageResponse(language) {
  return {
    id: language.id,
    name: language.name,
    autonym: language.autonym,
    region: language.region,
    speakers: language.speakers,
    words: language.words,
    status: language.status,
    accent: language.accent,
    verified: language.verified,
    reviewState: language.reviewState,
    rejectionReason: language.rejectionReason ?? null,
    reviewedAt: language.reviewedAt ?? null,
    removalRequestedAt: language.removalRequestedAt ?? null,
    removalRequestReason: language.removalRequestReason ?? null,
    createdById: language.createdById ?? null,
    deletedAt: language.deletedAt ?? null,
    deletionReason: language.deletionReason ?? null,
    createdAt: language.createdAt,
    updatedAt: language.updatedAt,
  };
}
