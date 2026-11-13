import Link from "next/link";
import AnimatedArrow from "@/components/AnimatedArrow";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import TrafficForecastChart from "@/components/TrafficForecastChart";
import metrics from "@/lib/traffic-metrics.json";

export const TRAFFIC_PROJECT_SLUG = "traffic-volume-forecasting";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function Stat({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-5">
      <p className="text-xl font-bold text-foreground sm:text-3xl">{value}</p>
      <h3 className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300 sm:mt-2 sm:text-sm">{label}</h3>
      {/* Phones show the three numbers side by side; the explanations are in the case study. */}
      <p className="mt-1 hidden text-xs leading-relaxed text-text-secondary sm:block">{detail}</p>
    </div>
  );
}

/** A working model next to the published paper: hourly traffic forecasts from an XGBoost model, shown against what actually happened. `caseStudyHref` is only passed once the project page exists. */
export default function ModelDemo({ caseStudyHref }: { caseStudyHref?: string }) {
  const { overall } = metrics;

  return (
    <section id="model-demo" className="py-16 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Model demo" title="Traffic forecasting with XGBoost">
          <p className="mt-3 max-w-2xl text-text-secondary">
            A model I built with my group that forecasts hourly traffic at signalised intersections in Victoria, Australia, up to two weeks ahead.
            Pick a site and a week to compare its forecast with what the detectors then counted.
          </p>
        </SectionHeading>

        <Reveal delay={100}>
          <div className="mt-10">
            <TrafficForecastChart />
          </div>
        </Reveal>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          <Stat
            value={percent(overall.model.wape)}
            label="Average error"
            detail={`About ${Math.round(overall.model.mae)} vehicles an hour, at sites averaging ${Math.round(metrics.meanHourlyVolume).toLocaleString("en-AU")} an hour.`}
          />
          <Stat
            value={percent(metrics.improvementOverLastWeek)}
            label="Less error than “last week”"
            detail={`And ${percent(metrics.improvementOverTypicalDay)} less than each site's typical-day average, the stronger of the two baselines.`}
          />
          <Stat
            value={`${(metrics.testRows / 1e6).toFixed(1)}M`}
            label="Forecasts tested"
            detail={`${metrics.sites} sites, every hour of October 2026, 1 to 14 days ahead. The model was trained only on earlier months.`}
          />
        </div>

        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-text-muted">
          These forecasts were computed in advance by the trained model on a month it never saw; this is not a live prediction. Data: Traffic Signal
          Volume Data, Department of Transport and Planning (Victoria), CC BY 4.0.
        </p>

        {caseStudyHref && (
          <Link href={caseStudyHref} className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 dark:text-indigo-300">
            Read the case study, including what went wrong first <AnimatedArrow />
          </Link>
        )}
      </div>
    </section>
  );
}
