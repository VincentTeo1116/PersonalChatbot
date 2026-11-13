"use client";

import { useId, useState, type ReactNode } from "react";

/** Two-panel switcher for the model demos. Both panels stay mounted; the hidden one loads nothing until it is shown, because each chart waits to be on screen. */
export default function DemoTabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const id = useId();

  return (
    <div>
      <div role="tablist" aria-label="Model demos" className="flex flex-wrap gap-2">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`${id}-panel-${i}`}
            onClick={() => setActive(i)}
            className={`min-h-11 rounded-full border px-5 text-sm font-semibold transition-colors ${
              active === i ? "border-indigo-600 bg-indigo-600 text-white" : "border-border text-text-secondary hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div key={tab.label} role="tabpanel" id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} hidden={active !== i} className="mt-8">
          {tab.content}
        </div>
      ))}
    </div>
  );
}
