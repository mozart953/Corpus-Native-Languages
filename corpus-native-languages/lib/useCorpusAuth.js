"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { apiFetch } from "./api";

function capitalise(value) {
  if (!value) return "Contributor";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Shared auth form logic for the home dialog and the /login page.
 *
 * Sign-up creates the account in the Express API (bcrypt + local provider),
 * then immediately signs in through NextAuth's `local` Credentials provider.
 * The session itself never contains a password or password hash.
 */
export function useCorpusAuth() {
  const { data: session, status, update } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const sessionUser = session?.user;
  const displayName =
    sessionUser?.name ?? sessionUser?.username ?? sessionUser?.email ?? null;

  const user = sessionUser
    ? {
        id: sessionUser.id ?? sessionUser.email,
        name: displayName,
        initials: (displayName ?? "?").slice(0, 2),
        role: capitalise(sessionUser.role ?? "contributor"),
        roleKey: sessionUser.role ?? "contributor",
      }
    : null;

  const login = useCallback(
    async ({ mode = "signin", name, email, password }) => {
      setSubmitting(true);
      setError(null);

      try {
        if (mode === "signup") {
          await apiFetch("/auth/register", {
            method: "POST",
            body: { username: name, email, password },
          });
        }

        const result = await signIn("local", {
          email,
          password,
          redirect: false,
        });

        if (!result || result.error) {
          setError(
            mode === "signup"
              ? "Your account was created, but the automatic sign-in failed. Please sign in."
              : "Invalid email or password.",
          );
          return false;
        }

        await update?.();
        return true;
      } catch (cause) {
        setError(cause?.message ?? "Could not complete the request.");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [update],
  );

  const logout = useCallback(async () => {
    setError(null);
    await signOut({ redirect: false });
    await update?.();
  }, [update]);

  return { user, status, submitting, error, setError, login, logout };
}
