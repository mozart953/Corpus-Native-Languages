import { REVIEW_STATES } from "../models/content.model.js";

/**
 * Public representation of a word. `languageName` is derived from the joined
 * language, and translation/usage come from the word's first (primary) sense.
 * The flat fields stay compatible with the existing frontend; `senses` is
 * additive and exposes the full normalized list.
 */
export function toWordResponse(word) {
  const senses = word.senses ?? [];
  const primarySense = senses[0] ?? null;
  const latestDecision = word.latestDecision ?? null;
  const removalRequest = word.latestRemovalRequest ?? null;

  return {
    id: word.id,
    languageId: word.languageId,
    languageName: word.language?.name ?? null,
    word: word.word,
    translation: primarySense?.gloss ?? "",
    pronunciation: word.pronunciation ?? "",
    partOfSpeech: word.partOfSpeechCode ?? "",
    usage: primarySense?.usage ?? "",
    verified: word.reviewStateCode === REVIEW_STATES.APPROVED,
    reviewState: word.reviewStateCode,
    rejectionReason:
      latestDecision?.stateCode === REVIEW_STATES.REJECTED
        ? latestDecision.comment ?? null
        : null,
    reviewedAt: latestDecision?.reviewerId ? latestDecision.createdAt : null,
    removalRequestedAt: removalRequest?.createdAt ?? null,
    removalRequestReason: removalRequest?.reason ?? null,
    createdById: word.createdById ?? null,
    deletedAt: word.deletedAt ?? null,
    deletionReason: word.deletionReason ?? null,
    createdAt: word.createdAt,
    updatedAt: word.updatedAt,

    // Normalized detail, safe for existing clients to ignore.
    senses: senses.map((sense) => ({
      id: sense.id,
      gloss: sense.gloss,
      usage: sense.usage ?? "",
      position: sense.position,
    })),
    partOfSpeechLabel: word.partOfSpeech?.label ?? null,
    reviewStateLabel: word.reviewState?.label ?? null,
  };
}
