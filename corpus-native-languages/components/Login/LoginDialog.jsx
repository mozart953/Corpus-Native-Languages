"use client";

import { useEffect, useRef } from "react";
import LoginComponent from "./Login.jsx";
import "./LoginDialog.css";

/**
 * Modal wrapper around the credential form.
 *
 * Login is optional on this site: the corpus is browsable and downloadable
 * without an account, so the form is always a dialog rather than a gate.
 * Handles Escape, backdrop clicks, focus capture on open and the scroll lock.
 */
function LoginDialog({ open = false, mode = "signin", onClose = null, onSubmit = null }) {
  const panelRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previousFocus.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const FOCUSABLE =
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)';

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;

      // Keep Tab cycling inside the dialog while it is open.
      const nodes = Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) ?? []);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    panelRef.current?.querySelector("input")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="loginDialog" role="presentation">
      <div className="loginDialog__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="loginDialog__panel"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "signup" ? "Create account" : "Sign in"}
      >
        <button
          type="button"
          className="loginDialog__close"
          onClick={onClose}
          aria-label="Close"
        >
          <span className="nl-icon nl-icon--close" aria-hidden="true" />
        </button>

        <LoginComponent mode={mode} onSubmit={onSubmit} onCancel={onClose} />
      </div>
    </div>
  );
}

export default LoginDialog;
