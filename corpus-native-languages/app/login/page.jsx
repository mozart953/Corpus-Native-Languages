"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoginComponent from "@/components/Login/Login.jsx";
import NavbarComponent from "@/components/Navbar/Navbar.jsx";
import { Button } from "@/components/ui/button";
import { useCorpusAuth } from "@/lib/useCorpusAuth";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();

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
            {t("loginPage.back")}
          </Link>

          {user ? (
            <section className="page__signedIn">
              <span className="nl-eyebrow">{t("loginPage.sessionActive")}</span>
              <h1 className="page__signedInTitle">
                {t("loginPage.signedInAs", { name: user.name })}
              </h1>
              <p className="page__loginNote" role="status">
                {t("loginPage.roleNote", { role: user.role })}
              </p>
              <div className="page__signedInActions">
                <Button asChild>
                  <Link href={rolePath(user)}>
                    {t("loginPage.openDesk", { role: user.role.toLowerCase() })}
                  </Link>
                </Button>
                <Button type="button" variant="outline" onClick={handleLogout}>
                  {t("loginPage.signOut")}
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
                  {t(mode === "signin" ? "loginPage.newHere" : "loginPage.already")}
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
                  {t(mode === "signin" ? "loginPage.create" : "loginPage.backToSignIn")}
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
  const { t } = useI18n();

  return (
    <div className="nl-page">
      <main className="nl-main">
        <div className="page__loginWrap">
          <div className="page__signedIn">
            <p className="page__loginNote">{t("loginPage.loading")}</p>
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
