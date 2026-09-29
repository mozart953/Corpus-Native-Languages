"use client";

import { useState } from "react";
import Link from "next/link";
import LoginComponent from "@/components/Login/Login.jsx";
import NavbarComponent from "@/components/Navbar/Navbar.jsx";
import "./page.css";

/**
 * Standalone sign-in page.
 *
 * The home page opens the same form in a dialog, so this route is the
 * deep-link version: useful for sharing a link, and it keeps the navbar
 * consistent with the rest of the site.
 *
 * As on the home page, nothing is sent anywhere — submitting only flips the
 * local state so the signed-in navbar can be seen.
 */
function LoginPage() {
  const [user, setUser] = useState(null);

  return (
    <div className="nl-page">
      <NavbarComponent
        user={user}
        onLogin={() => setUser(null)}
        onLogout={() => setUser(null)}
        activePath="/login"
      />

      <main className="nl-main">
        <div className="page__loginWrap">
          <Link href="/" className="page__back">
            ← Back to the corpus
          </Link>

          <LoginComponent
            onSubmit={({ name, email }) => {
              const fallback = email.split("@")[0].replace(/[._-]+/g, " ");
              const display = name || fallback;

              setUser({
                name: display,
                initials: display.slice(0, 2),
                role: "Contributor",
              });
            }}
          />

          {user ? (
            <p className="page__loginNote" role="status">
              Signed in as <strong>{user.name}</strong> on this device only. The navbar above is
              now showing the signed-in state — try signing out.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
