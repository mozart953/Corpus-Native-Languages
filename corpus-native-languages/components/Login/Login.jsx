"use client";

import { useId, useState } from "react";
import "./Login.css";

/**
 * Credential form used by both the dialog and the standalone /login page.
 *
 * It does not authenticate anything. It validates locally, then hands the
 * values to `onSubmit`, which is where the real request will be wired in.
 * `mode` switches the copy between signing in and creating an account, and
 * adds the name field for the latter.
 */
function LoginComponent({
  mode = "signin",
  onSubmit = null,
  onCancel = null,
  submitting = false,
  error = null,
}) {
  const isSignUp = mode === "signup";
  const formId = useId();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);

  const errorId = `${formId}-error`;

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((previous) => ({ ...previous, [field]: value }));
    setLocalError(null);
  };

  const validate = () => {
    if (isSignUp && values.name.trim().length < 2) {
      return "Please enter the name that will appear on your contributions.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      return "Please enter a valid email address.";
    }
    if (values.password.length < 8) {
      return "Your password needs at least 8 characters.";
    }
    return null;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const problem = validate();

    if (problem) {
      setLocalError(problem);
      return;
    }

    onSubmit?.({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
    });
  };

  const message = localError ?? error;

  return (
    <div className="login">
      <div className="login__aside">
        <span className="nl-eyebrow">{isSignUp ? "Join the corpus" : "Welcome back"}</span>
        <h2 className="login__asideTitle">
          {isSignUp ? "Help a language outlive its last speaker." : "Sign in to keep contributing."}
        </h2>
        <p className="login__asideText">
          {isSignUp
            ? "Contributors record pronunciations, usage examples and community review. Everything you add is reviewed before it becomes training data."
            : "Your drafts, reviews and the languages you follow are waiting for you."}
        </p>
        <ul className="login__perks">
          <li>Record words with audio and usage notes</li>
          <li>Review entries submitted by your community</li>
          <li>Download any language as JSON or TXT</li>
        </ul>
      </div>

      <form className="login__form" onSubmit={handleSubmit} noValidate>
        <h3 className="login__title">
          {isSignUp ? "Create your account" : "Sign in"}
        </h3>
        <p className="login__subtitle">
          {isSignUp
            ? "It takes a minute, and the corpus needs people like you."
            : "Enter your details to continue."}
        </p>

        {isSignUp ? (
          <div className="login__field">
            <label className="login__label" htmlFor={`${formId}-name`}>
              Name
            </label>
            <input
              id={`${formId}-name`}
              name="name"
              type="text"
              autoComplete="name"
              className="login__input"
              placeholder="How should we credit you?"
              value={values.name}
              onChange={update("name")}
            />
          </div>
        ) : null}

        <div className="login__field">
          <label className="login__label" htmlFor={`${formId}-email`}>
            Email
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            className="login__input"
            placeholder="you@community.org"
            value={values.email}
            onChange={update("email")}
          />
        </div>

        <div className="login__field">
          <label className="login__label" htmlFor={`${formId}-password`}>
            Password
          </label>
          <div className="login__passwordWrap">
            <input
              id={`${formId}-password`}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="login__input"
              placeholder="At least 8 characters"
              value={values.password}
              onChange={update("password")}
            />
            <button
              type="button"
              className="login__reveal"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {message ? (
          <p className="login__error" id={errorId} role="alert">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="nl-btn nl-btn--primary nl-btn--block login__submit"
          disabled={submitting}
          aria-describedby={message ? errorId : undefined}
        >
          {submitting
            ? "Please wait…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>

        {onCancel ? (
          <button type="button" className="nl-btn nl-btn--ghost nl-btn--block" onClick={onCancel}>
            Cancel
          </button>
        ) : null}

        <p className="login__fineprint">
          This is a demonstration form. Nothing is sent anywhere and no account is created.
        </p>
      </form>
    </div>
  );
}

export default LoginComponent;
