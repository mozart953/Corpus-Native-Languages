"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoginComponent from "@/components/Login/Login.jsx";
import NavbarComponent from "@/components/Navbar/Navbar.jsx";
import { Button } from "@/components/ui/button";
import { useCorpusAuth } from "@/lib/useCorpusAuth";
import "./page.css";

function rolePath(user) {
  if (!user) return "/";
  if (user.roleKey === "admin") return "/admin";
  if (user.roleKey === "reviewer") return "/review";
  return "/contribute";
}

function LoginPageContent() {
  const params = useSearchParams();
  const requestedMode = params.get("mode");
  const [mode, setMode] = useState(
    requestedMode === "signup" ? "signup" : "signin",
  );

  const { user, submitting, error, notice, setError, login, logout } =
    useCorpusAuth();

  const handleLogin = async ({ name, email, password }) => {
    await login({ mode, name, email, password });
  };

  const handleLogout = async () => {
    await logout();
    setMode("signin");
  };

  const handleNavLogin = (nextMode) => {
    setError(null);
    setMode(nextMode === "signup" ? "signup" : "signin");
  };

  return (
    <div className="nl-page">
      <NavbarComponent
        user={user}
        onLogin={handleNavLogin}
        onLogout={handleLogout}
        activePath="/login"
      />

      <main className="nl-main">
        <div className="page__loginWrap">
          <Link href="/" className="page__back">
            ← Back to the corpus
          </Link>

          {user ? (
            <section className="page__signedIn">
              <span className="nl-eyebrow">Session active</span>
              <h1 className="page__signedInTitle">Signed in as {user.name}</h1>
              <p className="page__loginNote" role="status">
                Your role is <strong>{user.role}</strong>. The session refreshes
                while you are active and expires after 30 minutes of inactivity.
              </p>
              <div className="page__signedInActions">
                <Button asChild>
                  <Link href={rolePath(user)}>
                    Open my {user.role.toLowerCase()} desk
                  </Link>
                </Button>
                <Button type="button" variant="outline" onClick={handleLogout}>
                  Sign out
                </Button>
              </div>
            </section>
          ) : (
            <>
              <LoginComponent
                mode={mode}
                onSubmit={handleLogin}
                submitting={submitting}
                error={error}
                notice={notice}
              />

              <div className="page__modeRow">
                <span>
                  {mode === "signin"
                    ? "New here? Accounts are reviewed before they can contribute."
                    : "Already approved? Use your email and password to sign in."}
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="page__modeToggle h-auto p-0"
                  onClick={() => {
                    setError(null);
                    setMode(mode === "signin" ? "signup" : "signin");
                  }}
                >
                  {mode === "signin" ? "Create an account" : "Back to sign in"}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="nl-page">
      <main className="nl-main">
        <div className="page__loginWrap">
          <div className="page__signedIn">
            <p className="page__loginNote">Loading the sign-in form…</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
