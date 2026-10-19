"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";

// Renders nothing unless NEXT_PUBLIC_GA_ID is set (so local dev and previews stay out of the data),
// and skips /admin so the owner's own edits aren't counted as visitors.
export default function GoogleAnalyticsLoader() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pathname = usePathname();
  if (!gaId || pathname.startsWith("/admin")) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
