"use client";

import Link from "next/link";
import LoginComponent from "@/components/Login/Login.jsx";
import NavbarComponent from "@/components/Navbar/Navbar.jsx";
import { useCorpusAuth } from "@/lib/useCorpusAuth";
import "./page.css";

/**
 * Standalone sign-in page.
 *
 * The home page opens the same form in a dialog, so this route is the
 * deep-link version. Authentication goes through NextAuth's `local`
 * Credentials provider, which delegates the password check to the Express
 * API. A successful sign-in creates the 30-minute session cookie.
 */
function LoginPage() {
  const { user, submitting, error, setError, login, logout } = useCorpusAuth();

  const handleLogin = async ({ email, password }) => {
    await login({ mode: "signin", email, password });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="nl-page">
      <NavbarComponent
        user={user}
        onLogin={() => setError(null)}
        onLogout={handleLogout}
        activePath="/login"
      />

      <main className="nl-main">
        <div className="page__loginWrap">
          <Link href="/" className="page__back">
            ← Back to the corpus
          </Link>

          <LoginComponent
            onSubmit={handleLogin}
            submitting={submitting}
            error={error}
          />

          {user ? (
            <p className="page__loginNote" role="status">
              Signed in as <strong>{user.name}</strong>. Your session refreshes
              while you are active and expires after 30 minutes of inactivity.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
