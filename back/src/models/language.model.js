export const LANGUAGE_STATUSES = Object.freeze([
  "active",
  "endangered",
  "critically-endangered",
]);

/**
 * Sortable columns. `words` is intentionally absent: the response value is a
 * derived count of approved entries, which SQLite cannot sort on through
 * Prisma without a raw query. `status` maps to the normalized `statusCode`.
 */
export const LANGUAGE_SORT_FIELDS = Object.freeze({
  name: "name",
  speakers: "speakers",
  status: "statusCode",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
});
