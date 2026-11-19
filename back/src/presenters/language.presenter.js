import { REVIEW_STATES } from "../models/content.model.js";

/**
 * Public representation of a language. The flat fields are the API contract
 * the frontend already consumes; `regions` and the label fields are additive.
 *
 * `region`, `words` and `verified` are derived:
 *   - region  = ordered Region names joined with ", "
 *   - words   = approved, non-deleted Word count
 *   - verified = current review state is approved
 */
export function toLanguageResponse(language) {
  const regions = (language.regions ?? [])
    .map((entry) => entry.region?.name ?? entry.regionName)
    .filter(Boolean);

  const latestDecision = language.latestDecision ?? null;
  const removalRequest = language.latestRemovalRequest ?? null;

  return {
    id: language.id,
    name: language.name,
    autonym: language.autonym,
    region: regions.join(", "),
    speakers: language.speakers,
    words: language._count?.entries ?? 0,
    status: language.statusCode,
    accent: language.accent,
    verified: language.reviewStateCode === REVIEW_STATES.APPROVED,
    reviewState: language.reviewStateCode,
    rejectionReason:
      latestDecision?.stateCode === REVIEW_STATES.REJECTED
        ? latestDecision.comment ?? null
        : null,
    reviewedAt: latestDecision?.reviewerId ? latestDecision.createdAt : null,
    removalRequestedAt: removalRequest?.createdAt ?? null,
    removalRequestReason: removalRequest?.reason ?? null,
    createdById: language.createdById ?? null,
    deletedAt: language.deletedAt ?? null,
    deletionReason: language.deletionReason ?? null,
    createdAt: language.createdAt,
    updatedAt: language.updatedAt,

    // Normalized detail, safe for existing clients to ignore.
    regions,
    statusLabel: language.status?.label ?? null,
    reviewStateLabel: language.reviewState?.label ?? null,
  };
}
