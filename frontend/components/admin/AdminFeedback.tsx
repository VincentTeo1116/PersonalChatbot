"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

// How long the success card stays up before it sends the admin back to the list.
const REDIRECT_DELAY_MS = 1700;
const AUTO_CLOSE_MS = 1400;

/** What admin server actions return so the UI can confirm (or explain) what happened. */
export type ActionResult = { ok?: boolean; error?: string; redirectTo?: string } | void;

type Feedback =
  | { kind: "success"; title: string; detail?: string; redirectTo?: string }
  | { kind: "error"; title: string; detail?: string };

type FeedbackApi = {
  showSuccess: (opts: { title: string; detail?: string; redirectTo?: string }) => void;
  showError: (detail: string, title?: string) => void;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useAdminFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useAdminFeedback must be used inside <AdminFeedbackProvider>");
  return ctx;
}

// Mounted once in the admin layout (not inside each form) so the confirmation survives the
// form that triggered it disappearing -- e.g. a deleted row vanishing when the list refreshes.
export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setFeedback(null);
  }, [clearTimer]);

  const showSuccess = useCallback<FeedbackApi["showSuccess"]>(
    ({ title, detail, redirectTo }) => {
      clearTimer();
      setFeedback({ kind: "success", title, detail, redirectTo });
      timer.current = window.setTimeout(
        () => {
          setFeedback(null);
          if (redirectTo) router.push(redirectTo);
        },
        redirectTo ? REDIRECT_DELAY_MS : AUTO_CLOSE_MS
      );
    },
    [clearTimer, router]
  );

  const showError = useCallback<FeedbackApi["showError"]>(
    (detail, title = "Couldn't save changes") => {
      clearTimer();
      setFeedback({ kind: "error", title, detail });
    },
    [clearTimer]
  );

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    if (!feedback) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [feedback, close]);

  const api = useMemo(() => ({ showSuccess, showError }), [showSuccess, showError]);
  const redirecting = feedback?.kind === "success" && feedback.redirectTo;

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key="admin-feedback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={close}
          >
            <motion.div
              role={feedback.kind === "error" ? "alertdialog" : "status"}
              aria-modal={feedback.kind === "error" ? true : undefined}
              aria-live="polite"
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="admin-card w-full max-w-sm overflow-hidden p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <StatusIcon kind={feedback.kind} />
              <p className="mt-4 text-lg font-semibold text-foreground">{feedback.title}</p>
              {feedback.detail && <p className="mt-1 text-sm text-text-secondary">{feedback.detail}</p>}

              {feedback.kind === "error" && (
                <button type="button" onClick={close} className="admin-btn admin-btn-primary mt-5">
                  Close
                </button>
              )}

              {redirecting && (
                <>
                  <p className="mt-3 text-xs text-text-subtle">Redirecting…</p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: REDIRECT_DELAY_MS / 1000, ease: "linear" }}
                    />
                  </div>
                  <button type="button" onClick={close} className="mt-3 text-xs font-medium text-indigo-500 hover:underline dark:text-indigo-300">
                    Stay on this page
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </FeedbackContext.Provider>
  );
}

function StatusIcon({ kind }: { kind: Feedback["kind"] }) {
  const ok = kind === "success";
  return (
    <motion.div
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
        ok ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"
      }`}
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <motion.path
          d={ok ? "M5 12.5l4.5 4.5L19 7.5" : "M6 6l12 12M18 6L6 18"}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
    </motion.div>
  );
}

/**
 * Drop-in replacement for `<form action={serverAction}>` in the admin. Runs the action, then
 * confirms it in the shared modal -- showing the action's own error if it returned one, and
 * sending the admin to `redirectTo` (or the action's `redirectTo`) after a success.
 */
export function AdminForm({
  action,
  message = "Changes saved",
  detail,
  redirectTo,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult> | ActionResult;
  message?: string;
  detail?: string;
  redirectTo?: string;
  className?: string;
  children: ReactNode;
}) {
  const { showSuccess, showError } = useAdminFeedback();

  async function run(formData: FormData) {
    try {
      const result = await action(formData);
      if (result && result.error) {
        showError(result.error);
        return;
      }
      showSuccess({ title: message, detail, redirectTo: (result && result.redirectTo) || redirectTo });
    } catch {
      showError("Something went wrong. Please try again.");
    }
  }

  return (
    <form action={run} className={className}>
      {children}
    </form>
  );
}
