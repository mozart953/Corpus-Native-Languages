/**
 * Normalized username key.
 *
 * Display names keep the capitalization and inner spacing the user chose, but
 * uniqueness is enforced on this key so "Wilson", "wilson" and "  wilson  "
 * cannot coexist. The same function runs during registration, self-service
 * changes, admin changes and the seed, so all rows use one definition.
 */
export function normalizeUsername(username) {
  return String(username ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
