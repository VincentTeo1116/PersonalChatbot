"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Demo = {
  start: string;
  days: number;
  horizons: number[];
  weeks: { start: number; days: number; label: string }[];
  sites: { id: number; dailyAverage: number; actual: (number | null)[]; lastWeek: (number | null)[]; model: Record<string, (number | null)[]> }[];
};

// Colour carries identity only on the marks; text stays in the site's text colours. Values live in globals.css (--viz-*) so light and dark each get their own validated step.
const SERIES = [
  { key: "actual", label: "Actual", color: "var(--viz-actual)", width: 2 },
  { key: "model", label: "Model forecast", color: "var(--viz-model)", width: 2 },
  { key: "lastWeek", label: "Same hour last week", color: "var(--viz-baseline)", width: 1.5 },
] as const;

const M = { top: 12, right: 12, bottom: 28, left: 44 };
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const number = new Intl.NumberFormat("en-AU");

// Top of the y-axis: four equal steps of a round size (1, 2, 2.5 or 5 times a power of ten), so every tick label is exact.
function niceMax(value: number) {
  const rough = Math.max(value, 1) / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) ?? rough;
  return step * 4;
}

// `also` must be present too, so the model and the baseline are scored on exactly the same hours.
function meanAbsError(actual: (number | null)[], predicted: (number | null)[], also: (number | null)[]) {
  let total = 0;
  let count = 0;
  let volume = 0;
  actual.forEach((a, i) => {
    const p = predicted[i];
    if (a === null || p === null || also[i] === null) return;
    total += Math.abs(a - p);
    volume += a;
    count += 1;
  });
  return count ? { mae: total / count, share: volume ? total / volume : 0 } : null;
}

/** Hour-by-hour actual traffic against the model's forecast and a simple baseline, for one site and week of the held-out test month. */
export default function TrafficForecastChart() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [demo, setDemo] = useState<Demo | null>(null);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  // Starts on the busiest site (the last one; sites are ordered from quiet to busy), a fixed rule rather than the site where the model looks best.
  const [siteIndex, setSiteIndex] = useState(7);
  const [weekIndex, setWeekIndex] = useState(0);
  const [horizon, setHorizon] = useState("7");
  const [hover, setHover] = useState<number | null>(null);

  // The data file (about 130 KB) is only fetched once the chart is close to the screen, so it costs nothing on first load.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const resize = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    resize.observe(box);
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        seen.disconnect();
        fetch("/data/traffic-demo.json")
          .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
          .then((data: Demo) => setDemo(data))
          .catch(() => setFailed(true));
      },
      { rootMargin: "400px" }
    );
    seen.observe(box);
    return () => {
      resize.disconnect();
      seen.disconnect();
    };
  }, []);

  const view = useMemo(() => {
    if (!demo) return null;
    const site = demo.sites[Math.min(siteIndex, demo.sites.length - 1)];
    const week = demo.weeks[Math.min(weekIndex, demo.weeks.length - 1)];
    const from = week.start * 24;
    const to = from + week.days * 24;
    const lines = {
      actual: site.actual.slice(from, to),
      model: (site.model[horizon] ?? site.model[String(demo.horizons[0])]).slice(from, to),
      lastWeek: site.lastWeek.slice(from, to),
    };
    const peak = Math.max(1, ...Object.values(lines).flat().filter((v): v is number => v !== null));
    const first = new Date(`${demo.start}T00:00:00Z`);
    first.setUTCDate(first.getUTCDate() + week.start);
    return { site, week, lines, max: niceMax(peak), first, model: meanAbsError(lines.actual, lines.model, lines.lastWeek), baseline: meanAbsError(lines.actual, lines.lastWeek, lines.model) };
  }, [demo, siteIndex, weekIndex, horizon]);

  const height = width < 480 ? 220 : 280;
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const points = view ? view.lines.actual.length : 0;
  const x = (i: number) => M.left + (points > 1 ? (i / (points - 1)) * innerW : 0);
  const y = (v: number) => M.top + innerH - (v / (view?.max ?? 1)) * innerH;

  // Missing hours break the line instead of being drawn as zero.
  const path = (values: (number | null)[]) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const dayOf = (i: number) => {
    if (!view) return "";
    const date = new Date(view.first);
    date.setUTCDate(date.getUTCDate() + Math.floor(i / 24));
    return `${DAY[date.getUTCDay()]} ${date.getUTCDate()}`;
  };

  function track(clientX: number, target: SVGElement) {
    if (!points) return;
    const rect = target.getBoundingClientRect();
    const ratio = (clientX - rect.left - M.left) / Math.max(1, innerW);
    setHover(Math.max(0, Math.min(points - 1, Math.round(ratio * (points - 1)))));
  }

  const select = "min-h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground";
  const ticks = view ? [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(view.max * t)) : [];

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          Traffic-signal site
          <select className={select} value={siteIndex} onChange={(e) => setSiteIndex(Number(e.target.value))} disabled={!demo}>
            {(demo?.sites ?? []).map((s, i) => (
              <option key={s.id} value={i}>
                Site {s.id} · about {number.format(s.dailyAverage)} vehicles a day
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          Week of October 2026
          <select className={select} value={weekIndex} onChange={(e) => setWeekIndex(Number(e.target.value))} disabled={!demo}>
            {(demo?.weeks ?? []).map((w, i) => (
              <option key={w.label} value={i}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          Forecast made
          <select className={select} value={horizon} onChange={(e) => setHorizon(e.target.value)} disabled={!demo}>
            {(demo?.horizons ?? [7]).map((h) => (
              <option key={h} value={String(h)}>
                {h} {h === 1 ? "day" : "days"} ahead
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-secondary" aria-label="Chart legend">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-0.5 w-5 rounded-full" style={{ background: s.color, height: s.width }} />
            {s.label}
          </li>
        ))}
      </ul>

      <div ref={boxRef} className="relative mt-2" style={{ height }}>
        {failed && <p className="pt-10 text-sm text-text-secondary">The chart data could not be loaded. Please refresh the page to try again.</p>}
        {!failed && !view && <div aria-hidden className="h-full animate-pulse rounded-xl bg-surface-hover" />}
        {view && width > 0 && (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`Hourly vehicles at site ${view.site.id} for ${view.week.label}: actual, model forecast and same hour last week. A table of daily totals follows the chart.`}
              className="touch-pan-y select-none"
              onPointerMove={(e) => track(e.clientX, e.currentTarget)}
              onPointerDown={(e) => track(e.clientX, e.currentTarget)}
              onPointerLeave={() => setHover(null)}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--border-color)" strokeWidth={1} />
                  <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--text-muted)">
                    {number.format(t)}
                  </text>
                </g>
              ))}
              {Array.from({ length: view.week.days }, (_, d) => (
                <text key={d} x={x(d * 24 + 12)} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                  {width < 480 ? dayOf(d * 24).split(" ")[0] : dayOf(d * 24)}
                </text>
              ))}
              {Array.from({ length: Math.max(0, view.week.days - 1) }, (_, d) => (
                <line key={d} x1={x((d + 1) * 24)} x2={x((d + 1) * 24)} y1={M.top + innerH} y2={M.top + innerH + 4} stroke="var(--border-color)" />
              ))}
              {[...SERIES].reverse().map((s) => (
                <path key={s.key} d={path(view.lines[s.key])} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {hover !== null && (
                <g pointerEvents="none">
                  <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + innerH} stroke="var(--text-subtle)" strokeWidth={1} />
                  {SERIES.map((s) => {
                    const v = view.lines[s.key][hover];
                    return v === null ? null : <circle key={s.key} cx={x(hover)} cy={y(v)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />;
                  })}
                </g>
              )}
            </svg>
            {hover !== null && (
              <div
                role="status"
                className="pointer-events-none absolute top-1 z-10 w-60 rounded-lg border border-border bg-background p-3 text-xs shadow-lg"
                style={x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}
              >
                <p className="font-semibold text-foreground">
                  {dayOf(hover)} Oct, {String(hover % 24).padStart(2, "0")}:00
                </p>
                {SERIES.map((s) => {
                  const v = view.lines[s.key][hover];
                  return (
                    <p key={s.key} className="mt-1 flex items-center justify-between gap-3 text-text-secondary">
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="tabular-nums font-medium text-foreground">{v === null ? "no data" : number.format(v)}</span>
                    </p>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <p className="mt-1 text-[11px] text-text-subtle">Vehicles per hour. Gaps are hours with a faulty detector.</p>

      {view?.model && view.baseline && (
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          For this site and week the model was off by{" "}
          <strong className="text-foreground">{number.format(Math.round(view.model.mae))} vehicles an hour</strong> on average (
          {(view.model.share * 100).toFixed(1)}% of traffic). &ldquo;Same hour last week&rdquo; was off by {number.format(Math.round(view.baseline.mae))} (
          {(view.baseline.share * 100).toFixed(1)}%).{" "}
          {view.model.mae > view.baseline.mae && "Here the simple baseline did better than the model, which does happen for some sites and weeks."}
        </p>
      )}

      {view && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-indigo-600 dark:text-indigo-300">View daily totals as a table</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[26rem] text-left tabular-nums">
              <thead className="text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="py-1.5 pr-4 font-medium">Day</th>
                  {SERIES.map((s) => (
                    <th key={s.key} className="py-1.5 pr-4 font-medium">
                      {s.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {Array.from({ length: view.week.days }, (_, d) => (
                  <tr key={d} className="border-t border-border">
                    <td className="py-1.5 pr-4 text-foreground">{dayOf(d * 24)} Oct</td>
                    {SERIES.map((s) => {
                      const hours = view.lines[s.key].slice(d * 24, d * 24 + 24);
                      return (
                        <td key={s.key} className="py-1.5 pr-4">
                          {hours.some((v) => v === null) ? "incomplete" : number.format(hours.reduce<number>((sum, v) => sum + (v ?? 0), 0))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
