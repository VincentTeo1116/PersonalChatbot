"use client";

import { useEffect } from "react";
import { motion } from "motion/react";

export default function ResumeModal({ resumeUrl, onClose }: { resumeUrl: string; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Resume</p>
          <div className="flex items-center gap-3">
            {/* Always-visible escape hatch: inline PDF rendering can be unreliable on some
                mobile browsers, so this never leaves the visitor stuck with a blank frame. */}
            <a
              href={resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
            >
              Open in new tab ↗
            </a>
            <button
              onClick={onClose}
              aria-label="Close resume preview"
              className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-surface-hover hover:text-foreground"
            >
              &times;
            </button>
          </div>
        </div>
        <iframe src={resumeUrl} title="Resume preview" className="min-h-0 flex-1 bg-white" />
      </motion.div>
    </motion.div>
  );
}
