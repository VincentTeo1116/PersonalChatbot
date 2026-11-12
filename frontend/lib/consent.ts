"use client";

import { useSyncExternalStore } from "react";

export type AnalyticsConsent = "granted" | "denied" | null;

const KEY = "portfolio:analytics-consent";
const EVENT = "portfolio:consent-changed";

export function readConsent(): AnalyticsConsent {
  try {
    const value = localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: AnalyticsConsent) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Reads the visitor's analytics choice; the server render and first client render both see null, so there is no hydration mismatch.
export function useConsent(): AnalyticsConsent {
  return useSyncExternalStore(subscribe, readConsent, () => null);
}

export function analyticsConfigured(): boolean {
  return /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_ID || "");
}
