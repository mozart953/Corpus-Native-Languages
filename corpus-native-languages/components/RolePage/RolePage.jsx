"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import NavbarComponent from "../Navbar/Navbar.jsx";
import { useCorpusAuth } from "../../lib/useCorpusAuth";
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
        <p className="roleGate__title">Checking your session…</p>
      </div>
    );
  } else if (!user) {
    gate = (
      <div className="roleGate">
        <span className="roleGate__icon" aria-hidden="true">
          NL
        </span>
        <h2 className="roleGate__title">Sign in to continue</h2>
        <p className="roleGate__text">
          This area is for approved contributors, reviewers and administrators.
          Public reading and downloads never require an account.
        </p>
        <div className="roleGate__actions">
          <button
            type="button"
            className="nl-btn nl-btn--primary"
            onClick={() => handleLogin("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className="nl-btn"
            onClick={() => handleLogin("signup")}
          >
            Create an account
          </button>
        </div>
      </div>
    );
  } else if (!isActive) {
    const labels = {
      pending: "Your account is waiting for admin approval.",
      rejected: "Your registration was rejected.",
      deactivated: "Your account has been deactivated.",
    };
    gate = (
      <div className="roleGate">
        <h2 className="roleGate__title">Account access paused</h2>
        <p className="roleGate__text">
          {user.statusReason || labels[user.status] || "Your account is not active."}
        </p>
        <Link href="/" className="nl-btn">
          Back to the corpus
        </Link>
      </div>
    );
  } else if (!hasRole) {
    gate = (
      <div className="roleGate">
        <h2 className="roleGate__title">This desk is not open to your role</h2>
        <p className="roleGate__text">
          You are signed in as <strong>{user.role}</strong>. Ask an admin if you
          need a different role.
        </p>
        <Link href="/contribute" className="nl-btn nl-btn--primary">
          Go to my contributions
        </Link>
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
