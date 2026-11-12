"use client";

import { useState } from "react";
import type { ContributionCalendar, ContributionDay } from "@/lib/github";

// Phones show only the most recent weeks so each square stays big enough to read and tap; from `sm` up the whole year fits.
const PHONE_WEEKS = 18;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVELS = ["bg-surface-hover", "bg-indigo-400/30", "bg-indigo-400/60", "bg-indigo-400", "bg-indigo-500"];

const utc = (date: string) => new Date(`${date}T00:00:00Z`);

function describe(day: ContributionDay) {
  const when = utc(day.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${day.count} contribution${day.count === 1 ? "" : "s"} on ${when}`;
}

/** Contribution calendar (weeks x days) in the site's indigo. Fills the available width; hover or tap a square to read that day's count. */
export default function ContributionGraph({ calendar }: { calendar: ContributionCalendar }) {
  const [selected, setSelected] = useState<ContributionDay | null>(null);
  const weeks = calendar.weeks.filter((week) => week.length > 0);
  const max = Math.max(1, ...weeks.flat().map((d) => d.count));
  const firstPhoneWeek = Math.max(0, weeks.length - PHONE_WEEKS);

  function level(count: number) {
    if (count === 0) return LEVELS[0];
    const ratio = count / max;
    return ratio > 0.75 ? LEVELS[4] : ratio > 0.5 ? LEVELS[3] : ratio > 0.25 ? LEVELS[2] : LEVELS[1];
  }

  // One handler on the grid instead of one per square (there are ~370 of them).
  function pick(target: EventTarget) {
    const key = (target as HTMLElement).dataset?.day;
    if (!key) return;
    const [w, d] = key.split("-").map(Number);
    setSelected(weeks[w]?.[d] ?? null);
  }

  const weekClass = (index: number) => (index < firstPhoneWeek ? "hidden sm:grid" : "grid");
  const columns = "grid grid-flow-col auto-cols-fr gap-[2px] sm:gap-[3px]";

  return (
    <div className="mt-8">
      <div
        role="img"
        aria-label={`${calendar.totalContributions} GitHub contributions in the last year`}
        onPointerOver={(e) => pick(e.target)}
        onClick={(e) => pick(e.target)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSelected(null)}
      >
        <div aria-hidden className={`${columns} mb-1 h-4 text-[10px] text-text-subtle`}>
          {weeks.map((week, wi) => {
            const month = utc(week[0].date).getUTCMonth();
            const starts = wi === firstPhoneWeek || wi === 0 || utc(weeks[wi - 1][0].date).getUTCMonth() !== month;
            // The first visible column always gets a label, but only on the screen size where it is the first.
            const only = wi === firstPhoneWeek && wi !== 0 && utc(weeks[wi - 1][0].date).getUTCMonth() === month ? "sm:hidden" : "";
            return (
              <span key={week[0].date} className={`${weekClass(wi)} overflow-visible whitespace-nowrap`}>
                {starts && <span className={only}>{MONTHS[month]}</span>}
              </span>
            );
          })}
        </div>

        <div className={columns}>
          {weeks.map((week, wi) => (
            <div key={week[0].date} className={`${weekClass(wi)} grid-rows-7 gap-[2px] sm:gap-[3px]`}>
              {week.map((day, di) => (
                <span
                  key={day.date}
                  data-day={`${wi}-${di}`}
                  style={{ gridRowStart: utc(day.date).getUTCDay() + 1 }}
                  className={`aspect-square w-full rounded-[2px] sm:rounded-[3px] ${level(day.count)} ${
                    selected?.date === day.date ? "ring-2 ring-foreground/70" : ""
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-text-subtle">
        <p aria-live="polite" className="min-h-4">
          {selected ? (
            <span className="font-medium text-foreground">{describe(selected)}</span>
          ) : (
            <>
              <span className="sm:hidden">Last {Math.min(PHONE_WEEKS, weeks.length)} weeks. Tap a square for details.</span>
              <span className="hidden sm:inline">Last 12 months. Hover a square for details.</span>
            </>
          )}
        </p>
        <p aria-hidden className="flex items-center gap-1">
          Less
          {LEVELS.map((cls) => (
            <span key={cls} className={`h-2.5 w-2.5 rounded-[2px] ${cls}`} />
          ))}
          More
        </p>
      </div>
    </div>
  );
}
