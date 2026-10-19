"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { track } from "@vercel/analytics";
import type { Profile } from "@/lib/types";

// A time-only popup interrupts people who are simply reading, so it waits for real engagement:
// enough time with the tab in view AND enough of the page scrolled.
const MIN_ACTIVE_SECONDS = 45;
const MIN_SCROLL_RATIO = 0.6;
const SNOOZE_DAYS = 14;
const STORAGE_KEY = "portfolio:contact-nudge-dismissed-at";

function isSnoozed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw !== null && Date.now() - Number(raw) < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false; // storage blocked (private window etc.): fall back to once per page view
  }
}

function snooze() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}

function safeTrack(name: string) {
  try {
    track(name);
  } catch {}
}

// Modals lock body scroll, the palette and other dialogs use role="dialog", and the chat widget
// flags its open panel with a class. Never stack the nudge on top of any of them. The widget's
// panel stays in the DOM with role="dialog" even when closed, so it only counts once opened.
function anotherLayerOpen() {
  return (
    document.body.style.overflow === "hidden" ||
    document.querySelector('.pcw-panel--open, [role="dialog"]:not(.pcw-panel)') !== null
  );
}

// The Contact section is already in view, so the nudge would only repeat what's on screen.
function contactInView() {
  const el = document.getElementById("contact");
  return el ? el.getBoundingClientRect().top < window.innerHeight * 0.8 : false;
}

export default function ContactNudge({ profile }: { profile: Profile }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isSnoozed()) return;

    let activeSeconds = 0;
    let maxScroll = 0;
    let shown = false;
    let watchTimer: number | undefined;

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0) maxScroll = Math.max(maxScroll, window.scrollY / scrollable);
    };

    // Visitors who reach for the meeting form themselves don't need to be nudged toward it.
    const onMeetingOpen = () => {
      snooze();
      setVisible(false);
    };

    const interval = window.setInterval(() => {
      if (shown && (anotherLayerOpen() || contactInView())) {
        setVisible(false);
        return;
      }
      if (document.visibilityState !== "visible") return;
      activeSeconds += 1;

      if (shown) return;
      if (activeSeconds < MIN_ACTIVE_SECONDS || maxScroll < MIN_SCROLL_RATIO) return;
      if (anotherLayerOpen() || contactInView()) return; // try again on the next tick

      shown = true;
      setVisible(true);
      safeTrack("contact_nudge_shown");
      window.clearInterval(interval);
      // Keep watching only to tuck the card away if the visitor opens something else.
      watchTimer = window.setInterval(() => {
        if (anotherLayerOpen() || contactInView()) setVisible(false);
      }, 1000);
    }, 1000);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("portfolio:open-meeting-request", onMeetingOpen);
    return () => {
      window.clearInterval(interval);
      if (watchTimer) window.clearInterval(watchTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("portfolio:open-meeting-request", onMeetingOpen);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  function dismiss() {
    snooze();
    setVisible(false);
  }

  function requestMeeting() {
    safeTrack("contact_nudge_meeting");
    snooze();
    setVisible(false);
    window.dispatchEvent(new CustomEvent("portfolio:open-meeting-request"));
  }

  function connectLinkedIn() {
    safeTrack("contact_nudge_linkedin");
    snooze();
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          role="region"
          aria-label="Get in touch"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-24 right-4 z-[9998] w-[min(calc(100vw-2rem),20rem)] rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:right-5"
        >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <p className="pr-6 text-sm font-semibold text-foreground">Enjoying the portfolio?</p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            I&apos;d be glad to hear from you, whether it&apos;s a role, a project or just a chat.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={requestMeeting}
              className="rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 active:scale-95"
            >
              Request a meeting
            </button>
            {profile.contact.linkedin && (
              <a
                href={profile.contact.linkedin}
                target="_blank"
                rel="noreferrer"
                onClick={connectLinkedIn}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/10 active:scale-95"
              >
                Connect on LinkedIn
              </a>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
