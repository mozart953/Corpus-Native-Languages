"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useI18n } from "../../lib/i18n";
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
  const { t } = useI18n();
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
      return t("login.error.name");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      return t("login.error.email");
    }
    if (values.password.length < 8) {
      return t("login.error.password");
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
          {t(isSignUp ? "login.eyebrow.signup" : "login.eyebrow.signin")}
        </span>
        <h2 className="login__asideTitle">
          {t(isSignUp ? "login.asideTitle.signup" : "login.asideTitle.signin")}
        </h2>
        <p className="login__asideText">
          {t(isSignUp ? "login.asideText.signup" : "login.asideText.signin")}
        </p>
        <ul className="login__perks">
          <li>{t("login.perk.record")}</li>
          <li>{t("login.perk.review")}</li>
          <li>{t("login.perk.download")}</li>
        </ul>
      </div>

      <form className="login__form" onSubmit={handleSubmit} noValidate>
        <div className="login__heading">
          <span className="login__mark" aria-hidden="true">
            NL
          </span>
          <div>
            <h3 className="login__title">
              {t(isSignUp ? "login.title.signup" : "login.title.signin")}
            </h3>
            <p className="login__subtitle">
              {t(isSignUp ? "login.subtitle.signup" : "login.subtitle.signin")}
            </p>
          </div>
        </div>

        {isSignUp ? (
          <div className="login__field">
            <Label className="login__label" htmlFor={`${formId}-name`}>
              {t("login.name")}
            </Label>
            <div className="login__inputWrap">
              <UserRound className="login__inputIcon" aria-hidden="true" />
              <Input
                id={`${formId}-name`}
                name="name"
                type="text"
                autoComplete="name"
                className="login__input"
                placeholder={t("login.namePlaceholder")}
                value={values.name}
                onChange={update("name")}
              />
            </div>
          </div>
        ) : null}

        <div className="login__field">
          <Label className="login__label" htmlFor={`${formId}-email`}>
            {t("login.email")}
          </Label>
          <div className="login__inputWrap">
            <Mail className="login__inputIcon" aria-hidden="true" />
            <Input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              className="login__input"
              placeholder={t("login.emailPlaceholder")}
              value={values.email}
              onChange={update("email")}
            />
          </div>
        </div>

        <div className="login__field">
          <Label className="login__label" htmlFor={`${formId}-password`}>
            {t("login.password")}
          </Label>
          <div className="login__inputWrap">
            <LockKeyhole className="login__inputIcon" aria-hidden="true" />
            <Input
              id={`${formId}-password`}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="login__input login__input--password"
              placeholder={t("login.passwordPlaceholder")}
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
              {showPassword ? t("login.hide") : t("login.show")}
            </Button>
          </div>
        </div>

        {message ? (
          <Alert variant="destructive" id={errorId} role="alert">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {notice ? (
          <Alert className="login__notice">
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
            ? t("login.submitting")
            : t(isSignUp ? "login.submit.signup" : "login.submit.signin")}
        </Button>

        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full"
            onClick={onCancel}
          >
            {t("login.cancel")}
          </Button>
        ) : null}

        <p className="login__fineprint">{t("login.fineprint")}</p>
      </form>
    </div>
  );
}

export default LoginComponent;
