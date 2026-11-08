"use client";

import LoginComponent from "./Login.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

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

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto border-white/10 bg-[#080808] p-0 shadow-2xl sm:max-w-3xl">
        <DialogTitle className="sr-only">
          {isSignUp ? "Create account" : "Sign in"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isSignUp
            ? "Create an account to contribute words and languages to the corpus."
            : "Sign in to contribute, review and manage the corpus."}
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
