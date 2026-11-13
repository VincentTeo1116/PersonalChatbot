import type { ReactNode } from "react";
import Link from "next/link";
import AnimatedArrow from "@/components/AnimatedArrow";
import DemoTabs from "@/components/DemoTabs";
import RapidKlForecastChart from "@/components/RapidKlForecastChart";
import SectionHeading from "@/components/SectionHeading";
import TrafficForecastChart from "@/components/TrafficForecastChart";
import rapidKl from "@/lib/rapidkl-forecast-seed.json";
import metrics from "@/lib/traffic-metrics.json";

export const TRAFFIC_PROJECT_SLUG = "traffic-volume-forecasting";
export const RAPIDKL_PROJECT_SLUG = "rapid-kl-ridership-forecast";

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

function Panel({ intro, chart, stats, note, link }: { intro: string; chart: ReactNode; stats: ReactNode; note: string; link?: { href: string; label: string } }) {
  return (
    <>
      <p className="max-w-2xl text-text-secondary">{intro}</p>
      <div className="mt-6">{chart}</div>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">{stats}</div>
      <p className="mt-6 max-w-3xl text-xs leading-relaxed text-text-muted">{note}</p>
      {link && (
        <Link href={link.href} className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 dark:text-indigo-300">
          {link.label} <AnimatedArrow />
        </Link>
      )}
    </>
  );
}

/** Working models next to the published paper. `caseStudies` lists the project slugs that exist, so a link only appears once its page does. */
export default function ModelDemo({ caseStudies = [] }: { caseStudies?: string[] }) {
  const { overall } = metrics;
  const { network, stations } = rapidKl.backtest;
  const href = (slug: string) => (caseStudies.includes(slug) ? `/projects/${slug}` : undefined);
  const rapidHref = href(RAPIDKL_PROJECT_SLUG);
  const trafficHref = href(TRAFFIC_PROJECT_SLUG);

  return (
    <section id="model-demo" className="py-16 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Model demos" title="Forecasting models you can try" />

        <div className="mt-8">
          <DemoTabs
            tabs={[
              {
                label: "Rapid KL ridership (live forecast)",
                content: (
                  <Panel
                    intro="How busy will the Rapid KL rail network be over the coming days? This XGBoost model forecasts daily passenger entries up to 28 days ahead for the whole network, each line and each of 166 stations, and is refreshed every evening with the newest published data."
                    chart={<RapidKlForecastChart />}
                    stats={
                      <>
                        <Stat
                          value={percent(network.model)}
                          label="Average error, network"
                          detail={`Tested on a full year of days the model never saw. The same test gives ${percent(stations.model)} for single stations.`}
                        />
                        <Stat
                          value={percent(1 - network.model / network.usual)}
                          label="Less error than the usual-level baseline"
                          detail={`The baseline (the median of the last six same weekdays) was off by ${percent(network.usual)}; "same day last week" by ${percent(network.lastWeek)}.`}
                        />
                        <Stat
                          value={percent(network.holidayModel)}
                          label="Error around holidays"
                          detail={`Public holidays, Chinese New Year and Hari Raya weeks, where the baseline is off by ${percent(network.holidayUsual)}.`}
                        />
                      </>
                    }
                    note="Forecasts are regenerated daily from the latest published figures. Station entries count each journey once, where it starts, so they are lower than the operator's official line ridership. Data: Daily Origin-Destination Ridership: Rapid Rail (KV), data.gov.my, CC BY 4.0."
                    link={rapidHref ? { href: rapidHref, label: "Read the case study" } : undefined}
                  />
                ),
              },
              {
                label: "Victoria road traffic (accuracy check)",
                content: (
                  <Panel
                    intro="A model I built with my group that forecasts hourly traffic at signalised intersections in Victoria, Australia, up to two weeks ahead. Pick a site and a week to compare its forecast with what the detectors then counted."
                    chart={<TrafficForecastChart />}
                    stats={
                      <>
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
                      </>
                    }
                    note="These forecasts were computed in advance by the trained model on a month it never saw; this is not a live prediction. Data: Traffic Signal Volume Data, Department of Transport and Planning (Victoria), CC BY 4.0."
                    link={trafficHref ? { href: trafficHref, label: "Read the case study, including what went wrong first" } : undefined}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
