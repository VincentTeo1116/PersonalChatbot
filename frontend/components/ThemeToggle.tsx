"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

const THEME_EVENT = "portfolio:theme-changed";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // document.documentElement isn't available during SSR, and the server has no way to know what the early inline theme script (app/layout.tsx's THEME_INIT_SCRIPT) set on <html> in the browser -- computing this during render instead (e.g. a lazy useState initializer) would mismatch the server-rendered "no icon yet" output and trigger a hydration error. Deferring to an effect is the correct fix here, not a lint issue.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Keeps every toggle on the page (desktop nav, phone menu) showing the same icon.
  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains("dark"));
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");

    const apply = () => {
      // Colour transitions are frozen for the switch so every element changes in the same frame.
      root.classList.add("theme-switching");
      root.classList.toggle("dark", next);
      void root.offsetHeight;
      window.setTimeout(() => root.classList.remove("theme-switching"), 120);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {}
      window.dispatchEvent(new Event(THEME_EVENT));
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reducedMotion) {
      apply();
      return;
    }

    // The browser snapshots the old page, paints the new theme underneath, then this reveals it as a circle growing from the button. The reveal runs on the compositor, so it stays smooth on any page, however long the repaint took.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    root.classList.add("theme-ripple");
    const transition = document.startViewTransition(() => flushSync(apply));
    transition.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 520, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
        );
      })
      .catch(() => {});
    transition.finished.finally(() => root.classList.remove("theme-ripple"));
  };

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={toggle}
      className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border text-text-secondary transition-all duration-200 hover:scale-105 hover:border-indigo-400/50 hover:text-foreground active:scale-95 ${className}`}
    >
      {isDark !== null && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            )}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  );
}
