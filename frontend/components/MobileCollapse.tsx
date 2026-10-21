"use client";

import { useId, useState, type ReactNode } from "react";

/** On small screens shows only a toggle and keeps the content in the DOM; from `lg` up it is always open. */
export default function MobileCollapse({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="mb-4 rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 active:scale-95 lg:hidden"
      >
        {open ? `Hide ${label}` : `Show ${label}`}
      </button>
      <div id={id} className={open ? "" : "hidden lg:block"}>
        {children}
      </div>
    </div>
  );
}
