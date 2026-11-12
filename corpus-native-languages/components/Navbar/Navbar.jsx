"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle.jsx";
import LanguageToggle from "@/components/LanguageToggle/LanguageToggle.jsx";
import { useI18n } from "../../lib/i18n";
import "./Navbar.css";

/**
 * Site navigation with two mutually exclusive states.
 *
 * Before login: language links plus "Sign in" and "Create account".
 * After login:  the same links, a user chip with the current role, and
 *               "Sign out". The sign-out button confirms first, because on
 *               this project a session can hold unsaved word drafts.
 *
 * There is no authentication logic here. The parent owns `user` and flips it
 * from `onLogin` / `onLogout`, so the component stays purely presentational.
 */
function NavbarComponent({
  user = null,
  onLogin = null,
  onLogout = null,
  activePath = "/",
  onLanguageClick = null,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const confirmRef = useRef(null);
  const { t } = useI18n();

  const isSignedIn = Boolean(user);
  const roleKey = user?.roleKey ?? "contributor";
  const canReview = roleKey === "reviewer" || roleKey === "admin";
  const isAdmin = roleKey === "admin";

  // Signed-in users get real routes instead of the landing-page anchors. The
  // review and admin links only appear for roles the API will actually accept.
  const links = isSignedIn
    ? [
        { id: "home", href: "/" },
        { id: "words", href: "/#words" },
        { id: "languages", href: "/#languages" },
        { id: "contribute", href: "/contribute" },
        ...(canReview ? [{ id: "review", href: "/review" }] : []),
        ...(isAdmin ? [{ id: "admin", href: "/admin" }] : []),
      ]
    : [
        { id: "home", href: "/" },
        { id: "words", href: "/#words" },
        { id: "languages", href: "/#languages" },
        { id: "contribute", href: "/#contribute" },
      ];

  useEffect(() => {
    if (confirmingSignOut) confirmRef.current?.focus();
  }, [confirmingSignOut]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const handleSignOut = () => {
    if (!confirmingSignOut) {
      setConfirmingSignOut(true);
      return;
    }
    setConfirmingSignOut(false);
    setMenuOpen(false);
    onLogout?.();
  };

  return (
    <header className="navbar">
      <div className="navbar__inner nl-container">
        <Link href="/" className="navbar__brand" onClick={() => setMenuOpen(false)}>
          <span className="navbar__mark" aria-hidden="true">
            NL
          </span>
          <span className="navbar__brandText">
            {t("nav.brand")}
            <small>{t("nav.brandSmall")}</small>
          </span>
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="navbar__toggle"
          aria-expanded={menuOpen}
          aria-controls="navbar-menu"
          aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>

        <div id="navbar-menu" className={`navbar__panel ${menuOpen ? "is-open" : ""}`}>
          <nav className="navbar__links" aria-label={t("nav.main")}>
            {links.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                onClick={onLanguageClick ? () => onLanguageClick(link.id) : undefined}
                className={`navbar__link ${
                  activePath === link.href ? "is-active" : ""
                }`}
              >
                {t(`nav.${link.id}`)}
              </Link>
            ))}
          </nav>

          <div className="navbar__actions">
            <LanguageToggle />
            <ThemeToggle />

            {isSignedIn ? (
              <>
                <div className="navbar__user">
                  <span className="navbar__avatar" aria-hidden="true">
                    {user.initials ?? user.name?.charAt(0) ?? "?"}
                  </span>
                  <span className="navbar__userText">
                    {user.name}
                    {user.role ? <small>{user.role}</small> : null}
                  </span>
                </div>

                {confirmingSignOut ? (
                  <div
                    className="navbar__confirm"
                    role="alertdialog"
                    aria-label={t("nav.confirmSignOut")}
                  >
                    <span>{t("nav.signOutQuestion")}</span>
                    <Button
                      type="button"
                      ref={confirmRef}
                      variant="destructive"
                      size="sm"
                      onClick={handleSignOut}
                    >
                      {t("nav.yesSignOut")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingSignOut(false)}
                    >
                      {t("nav.stay")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="navbar__signOut"
                    onClick={handleSignOut}
                  >
                    <LogOut className="size-3.5" aria-hidden="true" />
                    {t("nav.signOut")}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onLogin?.("signin")}
                >
                  {t("nav.signIn")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onLogin?.("signup")}
                >
                  {t("nav.createAccount")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default NavbarComponent;
