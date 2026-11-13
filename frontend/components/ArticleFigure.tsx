import type { ReactNode } from "react";

type Bar = { label: string; value: number; model?: boolean };
type BarGroup = { title: string; bars: Bar[] };

// Rapid KL forecast, whole network, test year 12 Nov 2025 to 11 Nov 2026. From rapidkl-forecast/results/metrics.json (byDayType.network).
const RAPIDKL_ERROR: BarGroup[] = [
  { title: "Ordinary days", bars: [
    { label: "Model", value: 3.6, model: true },
    { label: "Usual level for that weekday", value: 3.8 },
    { label: "Same weekday last week", value: 6.6 },
  ] },
  { title: "Around public holidays and festive seasons", bars: [
    { label: "Model", value: 9.8, model: true },
    { label: "Usual level for that weekday", value: 28.1 },
    { label: "Same weekday last week", value: 28.7 },
  ] },
];

/** Horizontal bars on one shared scale. Every bar carries its own name and value, so nothing depends on colour alone. */
function BarGroups({ groups, unit }: { groups: BarGroup[]; unit: string }) {
  const max = Math.max(...groups.flatMap((group) => group.bars.map((bar) => bar.value)));
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="text-sm font-semibold text-foreground">{group.title}</p>
          <ul className="mt-2 space-y-2">
            {group.bars.map((bar) => (
              <li key={bar.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm text-text-secondary">
                  <span>{bar.label}</span>
                  <span className="tabular-nums text-foreground">{bar.value.toFixed(1)}{unit}</span>
                </div>
                <div className="mt-1 h-3">
                  <div className="h-full min-w-1 rounded-r" style={{ width: `${(bar.value / max) * 100}%`, background: bar.model ? "var(--viz-model)" : "var(--viz-baseline)" }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const FIGURES = {
  "rapidkl-error-by-day-type": <BarGroups groups={RAPIDKL_ERROR} unit="%" />,
} satisfies Record<string, ReactNode>;

export type ArticleFigureId = keyof typeof FIGURES;

/** A chart inside an article. Charts are drawn by the page, so they follow the light and dark theme. */
export default function ArticleFigure({ id, caption }: { id: ArticleFigureId; caption: string }) {
  return (
    <figure className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      {FIGURES[id]}
      <figcaption className="mt-4 text-xs leading-relaxed text-text-subtle">{caption}</figcaption>
    </figure>
  );
}
