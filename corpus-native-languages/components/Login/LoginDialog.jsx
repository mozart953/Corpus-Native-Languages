"use client";

import LoginComponent from "./Login.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "../../lib/i18n";

/**
 * Modal wrapper around the credential form.
 *
 * Login is optional on this site: the corpus is browsable and downloadable
 * without an account, so the form is always a dialog rather than a gate.
 * Radix owns the focus trap, Escape handling and scroll lock; Login keeps the
 * actual validation and submit behaviour.
 */
function LoginDialog({
  open = false,
  mode = "signin",
  onClose = null,
  onSubmit = null,
  submitting = false,
  error = null,
  notice = null,
}) {
  const isSignUp = mode === "signup";
  const { t } = useI18n();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto border border-border bg-popover p-0 shadow-2xl sm:max-w-3xl">
        <DialogTitle className="sr-only">
          {t(isSignUp ? "login.dialog.titleSignup" : "login.dialog.titleSignin")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t(isSignUp ? "login.dialog.descSignup" : "login.dialog.descSignin")}
        </DialogDescription>

        <LoginComponent
          mode={mode}
          onSubmit={onSubmit}
          onCancel={onClose}
          submitting={submitting}
          error={error}
          notice={notice}
          compact
        />
      </DialogContent>
    </Dialog>
  );
}

export default LoginDialog;
