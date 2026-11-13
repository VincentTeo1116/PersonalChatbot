"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RapidKlForecast } from "@/lib/rapidkl-forecast";

const M = { top: 14, right: 12, bottom: 30, left: 52 };
const HISTORY_SHOWN = 28;
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const number = new Intl.NumberFormat("en-MY");
const LEGEND = [
  { label: "Actual entries", color: "var(--viz-actual)", height: 2 },
  { label: "Forecast", color: "var(--viz-model)", height: 2 },
  { label: "Likely range", color: "var(--viz-model)", height: 8, opacity: 0.22 },
  { label: "Usual for that weekday", color: "var(--viz-baseline)", height: 1.5 },
];

const utc = (date: string, offset = 0) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};
const short = (d: Date) => `${DAY[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]}`;

function niceMax(value: number) {
  const rough = Math.max(value, 1) / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) ?? rough;
  return step * 4;
}

/** Daily Rapid KL station entries: recent actuals, then the model's forecast for the coming days with a likely range, for the network, a line or a station. */
export default function RapidKlForecastChart() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<RapidKlForecast | null>(null);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  const [seriesId, setSeriesId] = useState("ALL");
  const [span, setSpan] = useState(14);
  const [hover, setHover] = useState<number | null>(null);
  const [allRows, setAllRows] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const resize = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    resize.observe(box);
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        seen.disconnect();
        fetch("/api/rapidkl-forecast")
          .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
          .then((json: RapidKlForecast) => {
            setData(json);
            // The data is normally one or two days behind; much older than that means the daily refresh has stopped.
            setStale((Date.now() - utc(json.dataThrough).getTime()) / 86400000 > 6);
          })
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

  const groups = useMemo(() => {
    if (!data) return [];
    const stations = data.series.filter((s) => s.kind === "stations");
    const codes = [...new Set(stations.map((s) => s.id.match(/^[A-Z]+/)?.[0] ?? ""))];
    const lineName = (code: string) => data.series.find((s) => s.id === `LINE:${code}`)?.label.replace(" (all stations)", "") ?? code;
    return [
      { label: "Network and lines", items: data.series.filter((s) => s.kind !== "stations") },
      ...codes.map((code) => ({ label: `${lineName(code)} stations`, items: stations.filter((s) => s.id.startsWith(code)) })),
    ];
  }, [data]);

  const view = useMemo(() => {
    if (!data) return null;
    const series = data.series.find((s) => s.id === seriesId) ?? data.series[0];
    const history = series.history.slice(-HISTORY_SHOWN);
    const days = data.days.slice(0, span);
    const take = (values: number[]) => values.slice(0, span);
    const forecast = take(series.forecast);
    const peak = Math.max(1, ...history.filter((v): v is number => v !== null), ...take(series.high));
    const first = utc(data.dataThrough, -(history.length - 1));
    const busiest = forecast.indexOf(Math.max(...forecast));
    const quietest = forecast.indexOf(Math.min(...forecast));
    const accuracy = data.backtest[series.kind];
    return { series, history, days, forecast, low: take(series.low), high: take(series.high), usual: take(series.usual), max: niceMax(peak), first, busiest, quietest, accuracy };
  }, [data, seriesId, span]);

  const height = width < 480 ? 230 : 300;
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = height - M.top - M.bottom;
  const total = view ? view.history.length + view.days.length : 0;
  const split = view ? view.history.length : 0; // index of the first forecast day
  const x = (i: number) => M.left + (total > 1 ? (i / (total - 1)) * innerW : 0);
  const y = (v: number) => M.top + innerH - (v / (view?.max ?? 1)) * innerH;
  const dateAt = (i: number) => (view ? utc(view.first.toISOString().slice(0, 10), i) : new Date());

  const line = (values: (number | null)[], offset: number) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i + offset).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  function track(clientX: number, target: SVGElement) {
    if (!total) return;
    const rect = target.getBoundingClientRect();
    const ratio = (clientX - rect.left - M.left) / Math.max(1, innerW);
    setHover(Math.max(0, Math.min(total - 1, Math.round(ratio * (total - 1)))));
  }

  const select = "min-h-10 max-w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground";
  const ticks = view ? [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(view.max * t)) : [];
  const lastActual = view ? [...view.history].reverse().find((v) => v !== null) ?? null : null;
  const rows = view ? (allRows ? view.days : view.days.slice(0, 7)) : [];
  const change = (forecast: number, usual: number) => (usual ? ((forecast - usual) / usual) * 100 : 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-text-muted">
          Network, line or station
          <select className={select} value={seriesId} onChange={(e) => setSeriesId(e.target.value)} disabled={!data}>
            {groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          Look ahead
          <select className={select} value={span} onChange={(e) => setSpan(Number(e.target.value))} disabled={!data}>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={28}>Next 28 days</option>
          </select>
        </label>
        {data && (
          <p className="pb-2 text-xs text-text-subtle">
            Data up to {short(utc(data.dataThrough))}. {stale && "The daily refresh looks delayed, so these forecasts are older than usual."}
          </p>
        )}
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-secondary" aria-label="Chart legend">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden className="inline-block w-5 rounded-sm" style={{ background: item.color, height: item.height, opacity: item.opacity ?? 1 }} />
            {item.label}
          </li>
        ))}
      </ul>

      <div ref={boxRef} className="relative mt-2" style={{ height }}>
        {failed && <p className="pt-10 text-sm text-text-secondary">The forecast could not be loaded. Please refresh the page to try again.</p>}
        {!failed && !view && <div aria-hidden className="h-full animate-pulse rounded-xl bg-surface-hover" />}
        {view && width > 0 && (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`Daily entries for ${view.series.label}: the last ${view.history.length} days and a forecast for the next ${view.days.length} days. The same forecast is in the table below.`}
              className="touch-pan-y select-none"
              onPointerMove={(e) => track(e.clientX, e.currentTarget)}
              onPointerDown={(e) => track(e.clientX, e.currentTarget)}
              onPointerLeave={() => setHover(null)}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="var(--border-color)" strokeWidth={1} />
                  <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--text-muted)">
                    {t >= 1e6 ? `${number.format(t / 1e6)}M` : t >= 1000 ? `${number.format(t / 1000)}k` : t}
                  </text>
                </g>
              ))}
              {/* A label on each Monday keeps the axis readable at every width. */}
              {Array.from({ length: total }, (_, i) => i)
                .filter((i) => dateAt(i).getUTCDay() === 1)
                .map((i) => (
                  <text key={i} x={x(i)} y={height - 10} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                    {dateAt(i).getUTCDate()} {MONTH[dateAt(i).getUTCMonth()]}
                  </text>
                ))}
              {/* Forecast region: starts after the last day with data. */}
              <line x1={x(split - 0.5)} x2={x(split - 0.5)} y1={M.top} y2={M.top + innerH} stroke="var(--text-subtle)" strokeWidth={1} />
              <text x={x(split - 0.5) + 6} y={M.top + 10} fontSize={11} fill="var(--text-muted)">
                Forecast
              </text>
              <path
                d={`${view.high.map((v, i) => `${i ? "L" : "M"}${x(split + i).toFixed(1)},${y(v).toFixed(1)}`).join("")}${[...view.low].reverse().map((v, i) => `L${x(split + view.low.length - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join("")}Z`}
                fill="var(--viz-model)"
                opacity={0.18}
              />
              <path d={line(view.usual, split)} fill="none" stroke="var(--viz-baseline)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
              <path d={line(view.history, 0)} fill="none" stroke="var(--viz-actual)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <path d={line(view.forecast, split)} fill="none" stroke="var(--viz-model)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {hover !== null && (
                <g pointerEvents="none">
                  <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + innerH} stroke="var(--text-subtle)" strokeWidth={1} />
                  {hover < split
                    ? view.history[hover] !== null && <circle cx={x(hover)} cy={y(view.history[hover] as number)} r={4} fill="var(--viz-actual)" stroke="var(--surface)" strokeWidth={2} />
                    : <circle cx={x(hover)} cy={y(view.forecast[hover - split])} r={4} fill="var(--viz-model)" stroke="var(--surface)" strokeWidth={2} />}
                </g>
              )}
            </svg>
            {hover !== null && (
              <div
                role="status"
                className="pointer-events-none absolute top-1 z-10 w-60 rounded-lg border border-border bg-background p-3 text-xs shadow-lg"
                style={x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}
              >
                <p className="font-semibold text-foreground">{short(dateAt(hover))}</p>
                {hover < split ? (
                  <p className="mt-1 flex justify-between gap-3 text-text-secondary">
                    Actual entries
                    <span className="tabular-nums font-medium text-foreground">{view.history[hover] === null ? "no data" : number.format(view.history[hover] as number)}</span>
                  </p>
                ) : (
                  <>
                    <p className="mt-1 flex justify-between gap-3 text-text-secondary">
                      Forecast <span className="tabular-nums font-medium text-foreground">{number.format(view.forecast[hover - split])}</span>
                    </p>
                    <p className="mt-1 flex justify-between gap-3 text-text-secondary">
                      Likely range
                      <span className="tabular-nums text-foreground">
                        {number.format(view.low[hover - split])} to {number.format(view.high[hover - split])}
                      </span>
                    </p>
                    <p className="mt-1 flex justify-between gap-3 text-text-secondary">
                      Usual for that weekday <span className="tabular-nums text-foreground">{number.format(view.usual[hover - split])}</span>
                    </p>
                    {view.days[hover - split].holiday && <p className="mt-1 text-text-secondary">{view.days[hover - split].holiday}</p>}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <p className="mt-1 text-[11px] text-text-subtle">
        Entries per day: each journey is counted once, at the station where it starts. The range is where 8 in 10 past forecasts fell.
      </p>

      {view && (
        <>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            Over the next {view.days.length} days the busiest day for {view.series.label} is forecast to be{" "}
            <strong className="text-foreground">
              {short(utc(view.days[view.busiest].date))} (about {number.format(Math.round(view.forecast[view.busiest] / 100) * 100)})
            </strong>
            , and the quietest {short(utc(view.days[view.quietest].date))} (about {number.format(Math.round(view.forecast[view.quietest] / 100) * 100)}).
            {lastActual !== null && ` The latest published day had ${number.format(lastActual)}.`} In a year of testing on unseen days, forecasts at this level were
            off by {(view.accuracy.model * 100).toFixed(1)}% on average.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm tabular-nums">
              <caption className="sr-only">Forecast entries per day for {view.series.label}</caption>
              <thead className="text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="py-1.5 pr-4 font-medium">Date</th>
                  <th className="py-1.5 pr-4 font-medium">Forecast</th>
                  <th className="py-1.5 pr-4 font-medium">Likely range</th>
                  <th className="py-1.5 pr-4 font-medium">Against usual</th>
                  <th className="py-1.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {rows.map((day, i) => {
                  const diff = change(view.forecast[i], view.usual[i]);
                  return (
                    <tr key={day.date} className="border-t border-border">
                      <td className="py-1.5 pr-4 text-foreground">{short(utc(day.date))}</td>
                      <td className="py-1.5 pr-4 font-medium text-foreground">{number.format(view.forecast[i])}</td>
                      <td className="py-1.5 pr-4">
                        {number.format(view.low[i])} to {number.format(view.high[i])}
                      </td>
                      <td className="py-1.5 pr-4">
                        {Math.abs(diff) < 0.5 ? "about the same" : `${Math.abs(diff).toFixed(0)}% ${diff > 0 ? "busier" : "quieter"}`}
                      </td>
                      <td className="py-1.5">{day.holiday ?? (day.ramadan ? "Ramadan" : "")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {view.days.length > 7 && (
            <button type="button" onClick={() => setAllRows((v) => !v)} aria-expanded={allRows} className="mt-3 text-sm font-medium text-indigo-600 dark:text-indigo-300">
              {allRows ? "Show the first 7 days only" : `Show all ${view.days.length} days`}
            </button>
          )}

          {data && data.track.length > 0 && (
            <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-text-secondary">
              <strong className="text-foreground">Track record:</strong> {data.track.length} network forecasts published here have since been checked against the
              real figures, with an average error of{" "}
              {((data.track.reduce((sum, t) => sum + Math.abs(t.forecast - t.actual), 0) / data.track.reduce((sum, t) => sum + t.actual, 0)) * 100).toFixed(1)}%.
            </p>
          )}
        </>
      )}
    </div>
  );
}
