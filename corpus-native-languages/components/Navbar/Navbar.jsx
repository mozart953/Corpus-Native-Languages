"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  const links = [
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

        <button
          type="button"
          className="navbar__toggle"
          aria-expanded={menuOpen}
          aria-controls="navbar-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={`nl-icon nl-icon--menu ${menuOpen ? "is-open" : ""}`} aria-hidden="true" />
        </button>

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
                    <button
                      type="button"
                      ref={confirmRef}
                      className="nl-btn nl-btn--sm nl-btn--danger"
                      onClick={handleSignOut}
                    >
                      Yes, sign out
                    </button>
                    <button
                      type="button"
                      className="nl-btn nl-btn--sm nl-btn--ghost"
                      onClick={() => setConfirmingSignOut(false)}
                    >
                      Stay
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="nl-btn nl-btn--sm navbar__signOut"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="nl-btn nl-btn--sm"
                  onClick={() => onLogin?.("signin")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className="nl-btn nl-btn--sm nl-btn--primary"
                  onClick={() => onLogin?.("signup")}
                >
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default NavbarComponent;
