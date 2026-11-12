"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import { analyticsConfigured, useConsent } from "@/lib/consent";

// Loads Google Analytics only in production, never on /admin, and only after the visitor has accepted it in the cookie banner. Nothing is sent to Google before that.
export default function GoogleAnalyticsLoader() {
  const pathname = usePathname();
  const consent = useConsent();
  if (!analyticsConfigured() || consent !== "granted" || pathname.startsWith("/admin") || process.env.NODE_ENV !== "production") return null;
  return <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />;
}
