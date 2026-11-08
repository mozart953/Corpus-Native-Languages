"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api";

function capitalise(value) {
  if (!value) return "Contributor";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Shared auth form logic for the home dialog, the /login page and the role
 * dashboards.
 *
 * Sign-up creates a pending account. We deliberately do not sign the user in
 * afterwards: an admin has to approve the account and assign a contributor or
 * reviewer role first.
 *
 * `/auth/me` is the source of truth for the UI. The NextAuth JWT keeps the
 * session identity, but role and status can change in the database at any
 * time, so the profile is refreshed after sign-in and periodically while a
 * page is open. A deactivated account is signed out on the next refresh.
 */
export function useCorpusAuth() {
  const { data: session, status, update } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [profile, setProfile] = useState(null);

  const sessionUser = session?.user;

  const refreshProfile = useCallback(
    async ({ silent = true } = {}) => {
      if (status !== "authenticated") {
        return null;
      }

      try {
        const response = await apiFetch("/auth/me");
        setProfile(response.data);
        return response.data;
      } catch (cause) {
        if (cause?.status === 401 || cause?.status === 403) {
          setProfile(null);
          if (!silent) setError(cause.message);
          await signOut({ redirect: false }).catch(() => {});
          await update?.();
        } else if (!silent) {
          setError(cause?.message ?? "Could not refresh your account.");
        }
        return null;
      }
    },
    [status, update],
  );

  useEffect(() => {
    if (status === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh after the awaited /auth/me request
      refreshProfile();
    }
  }, [status, refreshProfile]);

  // Role changes and deactivations should show up without a full reload.
  useEffect(() => {
    if (status !== "authenticated") return undefined;
    const interval = window.setInterval(() => refreshProfile(), 60 * 1000);
    return () => window.clearInterval(interval);
  }, [status, refreshProfile]);

  const source = profile ?? sessionUser;
  const displayName =
    profile?.username ?? sessionUser?.name ?? sessionUser?.username ?? sessionUser?.email ?? null;

  const user =
    sessionUser && status === "authenticated"
      ? {
        id: profile?.id ?? sessionUser.id ?? sessionUser.email,
        name: displayName,
        email: profile?.email ?? sessionUser.email ?? null,
        initials: (displayName ?? "?").slice(0, 2),
        role: capitalise(source?.role ?? "contributor"),
        roleKey: source?.role ?? "contributor",
        status: source?.status ?? "active",
        statusReason: source?.statusReason ?? null,
      }
    : null;

  const login = useCallback(
    async ({ mode = "signin", name, email, password }) => {
      setSubmitting(true);
      setError(null);
      setNotice(null);

      try {
        if (mode === "signup") {
          const registration = await apiFetch("/auth/register", {
            method: "POST",
            body: { username: name, email, password },
          });

          setNotice(
            registration?.meta?.message ??
              "Account created. An admin must approve it before you can sign in.",
          );
          return false;
        }

        const result = await signIn("local", {
          email,
          password,
          redirect: false,
        });

        if (!result || result.error) {
          // NextAuth collapses provider failures into a generic error. Ask the
          // API for the real reason so pending/deactivated accounts get a
          // useful message instead of "invalid password".
          try {
            await apiFetch("/auth/login", {
              method: "POST",
              body: { email, password },
            });
            setError("Could not start a session. Please try again.");
          } catch (cause) {
            setError(cause?.message ?? "Invalid email or password.");
          }
          return false;
        }

        await update?.();

        try {
          const me = await apiFetch("/auth/me");
          setProfile(me.data);
        } catch {
          // The session is valid even if the profile refresh is delayed.
        }

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
    setNotice(null);
    await signOut({ redirect: false });
    setProfile(null);
    await update?.();
  }, [update]);

  return {
    user,
    profile,
    status,
    submitting,
    error,
    notice,
    setError,
    setNotice,
    clearNotice: () => setNotice(null),
    refreshProfile,
    login,
    logout,
  };
}
