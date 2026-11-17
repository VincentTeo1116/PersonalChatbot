"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import AnimatedArrow from "@/components/AnimatedArrow";

const subscribe = () => () => {};
// Browsers without a built-in PDF viewer (most Android browsers, some in-app browsers) show an empty frame instead of the document, so they get the open/download panel instead. Browsers that do not report the flag are assumed capable.
const canPreviewPdf = () => (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled !== false;
// If the frame has not reported a load by then, offer the direct links alongside it rather than leaving a blank box.
const SLOW_LOAD_MS = 6000;

const ACTION_LINK = "text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:underline";

export default function ResumeModal({ resumeUrl, onClose }: { resumeUrl: string; onClose: () => void }) {
  const canPreview = useSyncExternalStore(subscribe, canPreviewPdf, () => true);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    if (!canPreview || loaded) return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [canPreview, loaded]);

  const directLinks = (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <a
        href={resumeUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 active:scale-95"
      >
        Open resume <AnimatedArrow direction="up-right" />
      </a>
      <a
        href={resumeUrl}
        download
        className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/10 active:scale-95"
      >
        Download PDF
      </a>
    </div>
  );

  // Rendered into <body>: the page sections use content-visibility, which would otherwise trap a fixed overlay inside its own section.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Resume"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ${canPreview ? "h-[calc(100dvh-2rem)]" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Resume</p>
          <div className="flex items-center gap-4">
            {/* Always-visible escape hatches, so a visitor is never stuck with a frame that will not render. */}
            <a href={resumeUrl} download className={ACTION_LINK}>
              Download
            </a>
            <a href={resumeUrl} target="_blank" rel="noreferrer" className={ACTION_LINK}>
              Open in new tab <AnimatedArrow direction="up-right" />
            </a>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close resume preview"
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-text-secondary hover:bg-surface-hover hover:text-foreground"
            >
              &times;
            </button>
          </div>
        </div>

        {canPreview ? (
          <div className="relative min-h-0 flex-1 bg-white">
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <p role="status" className="text-sm text-slate-600">
                  {slow ? "The preview is taking a while. You can open the file directly:" : "Loading resume…"}
                </p>
                {slow && directLinks}
              </div>
            )}
            <iframe src={resumeUrl} title="Resume preview" onLoad={() => setLoaded(true)} className="relative h-full w-full" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
              This browser cannot show a PDF inside the page. Open the resume in a new tab, or download it.
            </p>
            {directLinks}
          </div>
        )}
      </motion.div>
    </motion.div>
    ,
    document.body
  );
}
