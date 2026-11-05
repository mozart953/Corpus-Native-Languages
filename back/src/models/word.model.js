export const WORD_SORT_FIELDS = Object.freeze({
  word: "word",
  translation: "translation",
  languageId: "languageId",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
});

/**
 * Public representation of a word. `languageName` is derived from the joined
 * language instead of being duplicated in the database, so renaming a language
 * updates every word response automatically.
 */
export function toWordResponse(word) {
  return {
    id: word.id,
    languageId: word.languageId,
    languageName: word.language?.name ?? null,
    word: word.word,
    translation: word.translation,
    pronunciation: word.pronunciation ?? "",
    partOfSpeech: word.partOfSpeech ?? "",
    usage: word.usage ?? "",
    verified: word.verified,
    reviewState: word.reviewState,
    rejectionReason: word.rejectionReason ?? null,
    reviewedAt: word.reviewedAt ?? null,
    deletedAt: word.deletedAt ?? null,
    createdAt: word.createdAt,
    updatedAt: word.updatedAt,
  };
}
