"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { analyticsConfigured, useConsent, writeConsent } from "@/lib/consent";

/** Asks once, with equal weight on both answers, before Google Analytics is allowed to load. Shown only when analytics is configured. */
export default function ConsentBanner() {
  const consent = useConsent();
  const pathname = usePathname();
  if (!analyticsConfigured() || consent !== null || pathname.startsWith("/admin")) return null;

  return (
    <section
      role="region"
      aria-label="Analytics cookies"
      className="fixed inset-x-3 bottom-3 z-[9995] max-w-md rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:inset-x-auto sm:bottom-5 sm:left-5"
    >
      <p className="text-sm font-semibold text-foreground">Analytics cookies</p>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">
        I&apos;d like to use Google Analytics to see which pages are useful. It sets cookies and is off unless you accept.{" "}
        <Link href="/privacy" className="font-medium text-indigo-600 underline dark:text-indigo-300">
          Privacy policy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => writeConsent("denied")}
          className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/10 active:scale-95"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => writeConsent("granted")}
          className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/10 active:scale-95"
        >
          Accept
        </button>
      </div>
    </section>
  );
}
