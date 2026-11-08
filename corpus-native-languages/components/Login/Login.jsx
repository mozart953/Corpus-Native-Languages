"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  notice = null,
  compact = false,
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
    <div className={`login ${compact ? "login--compact" : ""}`}>
      <div className="login__aside">
        <span className="nl-eyebrow">
          {isSignUp ? "Join the corpus" : "Welcome back"}
        </span>
        <h2 className="login__asideTitle">
          {isSignUp
            ? "Help a language outlive its last speaker."
            : "Sign in to keep contributing."}
        </h2>
        <p className="login__asideText">
          {isSignUp
            ? "Contributors record pronunciations, usage examples and community review. Everything you add is reviewed before it becomes training data."
            : "Your drafts, reviews and the languages you follow are waiting for you."}
        </p>
        <ul className="login__perks">
          <li>Record words with pronunciation and usage notes</li>
          <li>Review entries submitted by your community</li>
          <li>Download any language as JSON or TXT</li>
        </ul>
      </div>

      <form className="login__form" onSubmit={handleSubmit} noValidate>
        <div className="login__heading">
          <span className="login__mark" aria-hidden="true">
            NL
          </span>
          <div>
            <h3 className="login__title">
              {isSignUp ? "Create your account" : "Sign in"}
            </h3>
            <p className="login__subtitle">
              {isSignUp
                ? "It takes a minute, and the corpus needs people like you."
                : "Enter your details to continue."}
            </p>
          </div>
        </div>

        {isSignUp ? (
          <div className="login__field">
            <Label className="login__label" htmlFor={`${formId}-name`}>
              Name
            </Label>
            <div className="login__inputWrap">
              <UserRound className="login__inputIcon" aria-hidden="true" />
              <Input
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
          </div>
        ) : null}

        <div className="login__field">
          <Label className="login__label" htmlFor={`${formId}-email`}>
            Email
          </Label>
          <div className="login__inputWrap">
            <Mail className="login__inputIcon" aria-hidden="true" />
            <Input
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
        </div>

        <div className="login__field">
          <Label className="login__label" htmlFor={`${formId}-password`}>
            Password
          </Label>
          <div className="login__inputWrap">
            <LockKeyhole className="login__inputIcon" aria-hidden="true" />
            <Input
              id={`${formId}-password`}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="login__input login__input--password"
              placeholder="At least 8 characters"
              value={values.password}
              onChange={update("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="login__reveal"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="size-3.5" aria-hidden="true" />
              ) : (
                <Eye className="size-3.5" aria-hidden="true" />
              )}
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        {message ? (
          <Alert variant="destructive" id={errorId} role="alert">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {notice ? (
          <Alert className="border-white/10 bg-white/[0.05] text-white">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="login__submit h-11 w-full text-[0.92rem]"
          disabled={submitting}
          aria-describedby={message ? errorId : undefined}
        >
          {submitting
            ? "Please wait…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </Button>

        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}

        <p className="login__fineprint">
          Passwords are hashed with bcrypt on the server. Sessions last 30
          minutes and refresh while you are active.
        </p>
      </form>
    </div>
  );
}

export default LoginComponent;
