import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import StatCounter from "@/components/StatCounter";
import { getGithubStats } from "@/lib/github";

/** Renders nothing if GitHub's API can't be reached, the URL isn't a real github.com
 * profile, or the account has no public data -- a GitHub hiccup should never break the
 * homepage, it should just mean this section quietly doesn't show up. */
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
          </div>
        </Reveal>

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
