"use client";

import { SessionProvider } from "next-auth/react";
import SessionRefresher from "./SessionRefresher.jsx";

/**
 * Client-side auth context. `refetchInterval` keeps the UI session in sync and
 * makes the /api/auth/session endpoint re-issue the cookie when it is older
 * than `updateAge`; SessionRefresher adds an explicit 20-minute refresh so a
 * long editing session does not silently expire at the 30-minute mark.
 */
export default function Providers({ children }) {
  return (
    <SessionProvider refetchInterval={20 * 60} refetchOnWindowFocus>
      <SessionRefresher />
      {children}
    </SessionProvider>
  );
}
