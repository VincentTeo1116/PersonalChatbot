import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import StatCounter from "@/components/StatCounter";
import { getGithubStats, type ContributionCalendar } from "@/lib/github";

// Contribution calendar as weeks x days, recolored indigo to match the site instead of GitHub's green.
function ContributionGraph({ calendar }: { calendar: ContributionCalendar }) {
  const max = Math.max(1, ...calendar.weeks.flat().map((d) => d.count));

  function levelClass(count: number) {
    if (count === 0) return "bg-surface-hover";
    const ratio = count / max;
    if (ratio > 0.75) return "bg-indigo-500";
    if (ratio > 0.5) return "bg-indigo-400";
    if (ratio > 0.25) return "bg-indigo-400/60";
    return "bg-indigo-400/30";
  }

  return (
    <div className="mt-6 overflow-x-auto pb-2">
      <div className="inline-grid grid-flow-col gap-[3px]">
        {calendar.weeks.map((week, wi) => (
          <div key={wi} className="grid grid-rows-7 gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}
                className={`h-[10px] w-[10px] rounded-[2px] ${levelClass(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Renders nothing if GitHub's API fails or the URL isn't valid -- don't let a GitHub hiccup break the homepage.
export default async function GithubStats({ githubUrl }: { githubUrl: string | undefined }) {
  const stats = await getGithubStats(githubUrl);
  if (!stats) return null;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <SectionHeading eyebrow="GitHub" title="Open-source activity" align="center" />

        <Reveal delay={100}>
          <div className="mt-10 flex flex-wrap justify-center gap-x-14 gap-y-6">
            <StatCounter value={stats.publicRepos} label="Public repos" />
            <StatCounter value={stats.totalStars} label="Stars earned" />
            <StatCounter value={stats.followers} label="Followers" />
            {stats.contributions && (
              <StatCounter value={stats.contributions.totalContributions} label="Contributions (1y)" />
            )}
          </div>
        </Reveal>

        {stats.contributions && (
          <Reveal delay={150}>
            <ContributionGraph calendar={stats.contributions} />
          </Reveal>
        )}

        {stats.topLanguages.length > 0 && (
          <Reveal delay={200}>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {stats.topLanguages.map((lang) => (
                <span
                  key={lang}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-secondary"
                >
                  {lang}
                </span>
              ))}
            </div>
          </Reveal>
        )}

        <Reveal delay={300}>
          <a
            href={`https://github.com/${stats.username}`}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
          >
            View full GitHub profile →
          </a>
        </Reveal>
      </div>
    </section>
  );
}
