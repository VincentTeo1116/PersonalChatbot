"use client";

import { useEffect } from "react";

/** Shown when a page fails to render (for example the content database is briefly unreachable), instead of a blank framework error screen. */
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-5xl font-bold text-transparent">Oops</p>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">This page could not load</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Something went wrong on my side, and it is usually temporary. Please try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-400 active:scale-95"
        >
          Try again
        </button>
        {/* A plain link on purpose: a full reload recovers from errors a client-side navigation would carry along. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-foreground/10 active:scale-95"
        >
          Back to homepage
        </a>
      </div>
    </main>
  );
}
