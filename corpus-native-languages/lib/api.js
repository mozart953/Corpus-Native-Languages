const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "/api/backend").replace(/\/+$/, "");

/** Turn an API-relative asset path into a URL the browser can request. */
export function apiAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export class ApiError extends Error {
  constructor(message, status, details, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

/**
 * Fetch wrapper for the corpus API.
 *
 * In the browser the base URL is `/api/backend`, which Next.js rewrites to the
 * Express server. Keeping requests same-origin means the NextAuth session
 * cookie is forwarded automatically and there is no CORS/credential dance.
 *
 * Reads retry once on a 5xx response. This covers a stale keep-alive connection
 * after the dev API restarts and does not retry mutations or rate limiting.
 */
export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers, ...rest } = options;
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const retryable = method === "GET";
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  let response;

  for (let attempt = 0; attempt <= (retryable ? 1 : 0); attempt += 1) {
    response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: {
        ...(body !== undefined && !isFormData
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
      cache: "no-store",
      ...rest,
    });

    if (!retryable || response.status < 500 || attempt === 1) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      payload?.error?.details,
      payload?.error?.code,
    );
  }

  return payload;
}
