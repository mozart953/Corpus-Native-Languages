"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const isSignedIn = Boolean(user);
  const roleKey = user?.roleKey ?? "contributor";
  const canReview = roleKey === "reviewer" || roleKey === "admin";
  const isAdmin = roleKey === "admin";

  // Signed-in users get real routes instead of the landing-page anchors. The
  // review and admin links only appear for roles the API will actually accept.
  const links = isSignedIn
    ? [
        { id: "home", href: "/", label: "Home" },
        { id: "words", href: "/#words", label: "Words" },
        { id: "languages", href: "/#languages", label: "Languages" },
        { id: "contribute", href: "/contribute", label: "Contribute" },
        ...(canReview ? [{ id: "review", href: "/review", label: "Review" }] : []),
        ...(isAdmin ? [{ id: "admin", href: "/admin", label: "Admin" }] : []),
      ]
    : [
        { id: "home", href: "/", label: "Home" },
        { id: "words", href: "/#words", label: "Words" },
        { id: "languages", href: "/#languages", label: "Languages" },
        { id: "contribute", href: "/#contribute", label: "Contribute" },
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
            Native Languages
            <small>Corpus Guatemala</small>
          </span>
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="navbar__toggle"
          aria-expanded={menuOpen}
          aria-controls="navbar-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>

        <div id="navbar-menu" className={`navbar__panel ${menuOpen ? "is-open" : ""}`}>
          <nav className="navbar__links" aria-label="Main">
            {links.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                onClick={onLanguageClick ? () => onLanguageClick(link.id) : undefined}
                className={`navbar__link ${
                  activePath === link.href ? "is-active" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="navbar__actions">
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
                    aria-label="Confirm sign out"
                  >
                    <span>Sign out?</span>
                    <Button
                      type="button"
                      ref={confirmRef}
                      variant="destructive"
                      size="sm"
                      onClick={handleSignOut}
                    >
                      Yes, sign out
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingSignOut(false)}
                    >
                      Stay
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
                    Sign out
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
                  Sign in
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onLogin?.("signup")}
                >
                  Create account
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
