"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import NavbarComponent from "../Navbar/Navbar.jsx";
import { useCorpusAuth } from "../../lib/useCorpusAuth";
import { useI18n } from "../../lib/i18n";
import "./RolePage.css";

/**
 * Shared shell for the authenticated role pages.
 *
 * It owns the navbar, the page heading, and the three gates that matter:
 * not signed in, account not active, and role not allowed. The API enforces
 * the same rules; this is only the friendly surface.
 *
 * `children` may be a render function, so dashboards receive the live user
 * object without each one calling useCorpusAuth again.
 */
export default function RolePage({
  activePath,
  eyebrow,
  title,
  subtitle,
  allowedRoles = null,
  children = null,
}) {
  const { user, status, logout } = useCorpusAuth();
  const { t } = useI18n();
  const router = useRouter();

  const handleLogin = (mode) => {
    router.push(mode === "signup" ? "/login?mode=signup" : "/login");
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const isActive = user && (user.status ?? "active") === "active";
  const hasRole =
    user && (!allowedRoles || allowedRoles.includes(user.roleKey));

  let gate = null;
  if (status === "loading") {
    gate = (
      <div className="roleGate">
        <p className="roleGate__title">{t("role.checking")}</p>
      </div>
    );
  } else if (!user) {
    gate = (
      <div className="roleGate">
        <span className="roleGate__icon" aria-hidden="true">
          NL
        </span>
        <h2 className="roleGate__title">{t("role.signInTitle")}</h2>
        <p className="roleGate__text">{t("role.signInText")}</p>
        <div className="roleGate__actions">
          <Button type="button" onClick={() => handleLogin("signin")}>
            {t("role.signIn")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleLogin("signup")}
          >
            {t("role.createAccount")}
          </Button>
        </div>
      </div>
    );
  } else if (!isActive) {
    const labels = {
      pending: t("role.pending"),
      rejected: t("role.rejected"),
      deactivated: t("role.deactivated"),
    };
    gate = (
      <div className="roleGate">
        <h2 className="roleGate__title">{t("role.pausedTitle")}</h2>
        <p className="roleGate__text">
          {user.statusReason || labels[user.status] || t("role.inactive")}
        </p>
        <Button asChild variant="outline">
          <Link href="/">{t("role.back")}</Link>
        </Button>
      </div>
    );
  } else if (!hasRole) {
    gate = (
      <div className="roleGate">
        <h2 className="roleGate__title">{t("role.wrongRoleTitle")}</h2>
        <p className="roleGate__text">
          {t("role.wrongRoleText", { role: user.role })}
        </p>
        <Button asChild>
          <Link href="/contribute">{t("role.goContributions")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="nl-page">
      <NavbarComponent
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        activePath={activePath}
      />

      <main className="nl-main rolePage">
        <header className="rolePage__header">
          <span className="nl-eyebrow">{eyebrow}</span>
          <h1 className="rolePage__title">{title}</h1>
          <p className="rolePage__subtitle">{subtitle}</p>
        </header>

        {gate ?? (typeof children === "function" ? children(user) : children)}
      </main>
    </div>
  );
}
