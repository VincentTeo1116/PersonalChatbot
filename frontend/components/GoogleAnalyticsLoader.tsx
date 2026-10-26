"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";

// Renders nothing unless NEXT_PUBLIC_GA_ID is set (so local dev and previews stay out of the data), and skips /admin so the owner's own edits aren't counted as visitors.
export default function GoogleAnalyticsLoader() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pathname = usePathname();
  if (!/^G-[A-Z0-9]+$/.test(gaId || "") || pathname.startsWith("/admin") || process.env.NODE_ENV !== "production") return null;
  return <GoogleAnalytics gaId={gaId!} />;
}
