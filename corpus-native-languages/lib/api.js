const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "/api/backend").replace(/\/+$/, "");

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
 */
export async function apiFetch(path, options = {}) {
  const { method = "GET", body, headers, ...rest } = options;
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    ...rest,
  });

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
