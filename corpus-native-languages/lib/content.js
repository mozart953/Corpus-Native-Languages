/**
 * Server-side page-copy loader.
 *
 * The Express API owns the bundled English/Spanish defaults plus any admin
 * overrides. Reading it in the root layout means the first HTML response
 * already contains translated copy, so a visitor never sees message keys
 * flash before the client provider hydrates.
 *
 * This module must only be imported from server components. `API_URL` is the
 * absolute Express address; the browser-facing `/api/backend` rewrite is not
 * reachable during server rendering.
 */

const API_URL = (process.env.API_URL ?? "http://localhost:4000/api/v1").replace(
  /\/+$/,
  "",
);

const LOCALE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export const DEFAULT_LOCALE = "en";

/** Shape returned when the API cannot be reached during a server render. */
const EMPTY_CONTENT = Object.freeze({
  locale: DEFAULT_LOCALE,
  messages: {},
  locales: [],
});

export async function fetchPageContent(locale) {
  const code = LOCALE_PATTERN.test(String(locale ?? "")) ? locale : DEFAULT_LOCALE;

  try {
    const response = await fetch(
      `${API_URL}/content/${encodeURIComponent(code)}`,
      { cache: "no-store" },
    );

    if (!response.ok) return EMPTY_CONTENT;

    const payload = await response.json();
    const data = payload?.data;

    if (!data || typeof data !== "object") return EMPTY_CONTENT;

    return {
      locale: data.locale ?? code,
      messages:
        data.messages && typeof data.messages === "object" ? data.messages : {},
      locales: Array.isArray(data.locales) ? data.locales : [],
    };
  } catch {
    // A frontend-only development session still renders; the provider retries
    // in the browser once the API is available.
    return EMPTY_CONTENT;
  }
}
