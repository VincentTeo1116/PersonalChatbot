"use client";

import { analyticsConfigured, useConsent, writeConsent } from "@/lib/consent";

/** Shows the current analytics choice on the privacy page and lets the visitor change it. */
export default function ConsentPreferences() {
  const consent = useConsent();
  if (!analyticsConfigured()) return <p className="mt-3 text-sm text-text-secondary">Google Analytics is not enabled on this site right now.</p>;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <span className="text-text-secondary">
        Your choice: <strong className="text-foreground">{consent === "granted" ? "Analytics accepted" : consent === "denied" ? "Analytics declined" : "Not chosen yet"}</strong>
      </span>
      <button type="button" onClick={() => writeConsent("granted")} className="rounded-full border border-border px-4 py-1.5 font-semibold text-foreground hover:bg-foreground/10">
        Accept
      </button>
      <button type="button" onClick={() => writeConsent("denied")} className="rounded-full border border-border px-4 py-1.5 font-semibold text-foreground hover:bg-foreground/10">
        Decline
      </button>
    </div>
  );
}
