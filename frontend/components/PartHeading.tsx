import type { ReactNode } from "react";

/** A numbered sub-heading for a part inside a section, so two related blocks can share one section and still read as separate. */
export default function PartHeading({ number, title, children }: { number: string; title: string; children?: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span aria-hidden className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-600 dark:text-indigo-300">
          {number}
        </span>
        <h3 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h3>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      {children}
    </div>
  );
}
