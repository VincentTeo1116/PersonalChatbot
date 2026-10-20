"use client";

import { useState } from "react";

// Lets the admin hand people a link to the public /testimonial page. Submissions still land
// as "pending" in the list below until approved, same as the form on the home page.
export default function InviteLinkCard({ url, ownerName }: { url: string; ownerName: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const message = `Hi! I'd really appreciate a short testimonial about working with me. It only takes a minute: ${url}`;

  async function copy() {
    let ok = false;
    try {
      // Raced against a short timeout: in some browser states writeText neither resolves nor
      // rejects (e.g. a pending permission prompt), which would leave the button stuck.
      await Promise.race([
        navigator.clipboard.writeText(url),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("timeout")), 1500)),
      ]);
      ok = true;
    } catch {
      // Clipboard API needs a secure context/permission; fall back to select-and-copy.
      const input = document.getElementById("invite-link-input") as HTMLInputElement | null;
      input?.select();
      try {
        ok = document.execCommand("copy");
      } catch {}
    }
    setStatus(ok ? "copied" : "failed");
    window.setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <section className="admin-card mb-6 p-5">
      <h2 className="text-sm font-semibold text-foreground">Invite someone to leave a testimonial</h2>
      <p className="mt-1 text-xs text-text-secondary">
        Share this link with anyone you&apos;ve worked with. What they submit shows up below as{" "}
        <span className="font-medium">Pending</span> until you approve it.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="invite-link-input"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Testimonial invite link"
          className="admin-input min-w-0 flex-1"
        />
        <button type="button" onClick={copy} className="admin-btn admin-btn-primary shrink-0">
          {status === "copied" ? "Copied ✓" : status === "failed" ? "Press Ctrl+C" : "Copy link"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          className="admin-btn admin-btn-ghost px-3 py-1.5 text-xs"
        >
          Share on WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(`A quick favour from ${ownerName}`)}&body=${encodeURIComponent(message)}`}
          className="admin-btn admin-btn-ghost px-3 py-1.5 text-xs"
        >
          Share by email
        </a>
        <a href={url} target="_blank" rel="noreferrer" className="admin-btn admin-btn-ghost px-3 py-1.5 text-xs">
          Preview page ↗
        </a>
      </div>
    </section>
  );
}
