import "server-only";
import seed from "@/lib/rapidkl-forecast-seed.json";

export type RapidKlSeries = {
  id: string;
  label: string;
  kind: "network" | "lines" | "stations";
  history: (number | null)[];
  forecast: number[];
  low: number[];
  high: number[];
  usual: number[];
};

type Accuracy = { model: number; usual: number; lastWeek: number; holidayModel: number; holidayUsual: number };

export type RapidKlForecast = {
  generatedAt: string;
  dataThrough: string;
  historyStart: string;
  days: { date: string; horizon: number; holiday: string | null; ramadan: boolean }[];
  series: RapidKlSeries[];
  track: { date: string; madeOn: string; daysAhead: number; forecast: number; actual: number }[];
  backtest: { period: string[]; trees: number; testRows: number; network: Accuracy; lines: Accuracy; stations: Accuracy; networkByHorizon: { days: number; model: number; usual: number }[] };
  source: string;
};

// Published every evening by .github/workflows/rapidkl-forecast.yml as a file on the repository's "forecast-data" release.
const REMOTE = process.env.RAPIDKL_FORECAST_URL || "https://github.com/VincentTeo1116/PersonalChatbot/releases/download/forecast-data/rapidkl-forecast.json";

function looksValid(data: unknown): data is RapidKlForecast {
  const d = data as RapidKlForecast;
  return !!d && typeof d.dataThrough === "string" && Array.isArray(d.days) && d.days.length > 0 && Array.isArray(d.series) && d.series.some((s) => s.id === "ALL");
}

/** The newest forecast available: the daily published file when it can be fetched and is newer, otherwise the copy shipped with the site. */
export async function getRapidKlForecast(): Promise<RapidKlForecast> {
  const bundled = seed as RapidKlForecast;
  try {
    const res = await fetch(REMOTE, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const remote: unknown = await res.json();
      if (looksValid(remote) && remote.dataThrough >= bundled.dataThrough) return remote;
    }
  } catch {}
  return bundled;
}
