"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";

/** Drop-in for a delete submit button: asks for confirmation, then submits its parent form. */
export default function DeleteButton({
  what = "this item",
  className,
}: {
  what?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function confirm() {
    setOpen(false);
    triggerRef.current?.form?.requestSubmit();
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={className}>
        Delete
      </button>
      {open &&
        createPortal(
          <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              >
                <motion.div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="delete-confirm-title"
                  initial={{ opacity: 0, scale: 0.92, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="admin-card w-full max-w-sm p-6 text-center shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
                    </svg>
                  </div>
                  <p id="delete-confirm-title" className="mt-4 text-lg font-semibold text-foreground">Delete {what}?</p>
                  <p className="mt-1 text-sm text-text-secondary">This can&apos;t be undone.</p>
                  <div className="mt-5 flex justify-center gap-3">
                    <button ref={cancelRef} type="button" onClick={() => setOpen(false)} className="admin-btn admin-btn-ghost">
                      Cancel
                    </button>
                    <button type="button" onClick={confirm} className="admin-btn admin-btn-danger">
                      Delete
                    </button>
                  </div>
                </motion.div>
          </motion.div>,
          document.body
        )}
    </>
  );
}
