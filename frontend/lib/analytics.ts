"use client";

import { track } from "@vercel/analytics";
import { sendGAEvent } from "@next/third-parties/google";
import type { PortfolioEvent } from "@/lib/analytics-events";

function publicProductionPage() {
  return typeof window !== "undefined" && process.env.NODE_ENV === "production" && !window.location.pathname.startsWith("/admin");
}

export function reportGaEvent(name: string, parameters: Record<string, string | number>) {
  if (!publicProductionPage() || !/^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_ID || "")) return;
  // Third-party scripts may be disabled by the visitor; analytics must never interrupt an action.
  if (!(window as unknown as { dataLayer?: unknown[] }).dataLayer) return;
  try { sendGAEvent("event", name, parameters); } catch {}
}

export function trackPortfolioEvent(name: PortfolioEvent) {
  if (!publicProductionPage()) return;
  const parameters = { page_path: window.location.pathname };
  try { track(name, parameters); } catch {}
  reportGaEvent(name, parameters);
}
