"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes

/**
 * Keeps a 30-minute session alive while the user is actually active.
 *
 * Calling `update()` hits the NextAuth session endpoint. When the token is
 * older than the configured `updateAge`, Auth.js re-issues the encrypted
 * session cookie with a fresh 30-minute expiry. An idle tab therefore still
 * expires normally; an open, used tab gets a rolling cookie.
 */
export default function SessionRefresher() {
  const { status, update } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return undefined;

    const refresh = () => {
      update().catch(() => {
        // A network hiccup should not break the UI; the next tick retries.
      });
    };

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [status, update]);

  return null;
}
