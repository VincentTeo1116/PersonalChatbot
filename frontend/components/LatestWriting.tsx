import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import AnimatedArrow from "@/components/AnimatedArrow";
import { latestArticles } from "@/lib/writing";

const formatDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** The three newest articles as compact rows. Kept short on purpose: titles only on phones, with the one-line summary from tablet width up. */
export default function LatestWriting() {
  const latest = latestArticles(3);
  if (!latest.length) return null;

  return (
    <section id="writing" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Writing" title="The stories behind the projects" />
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {latest.map((article) => (
            <li key={article.slug}>
              <Link href={`/writing/${article.slug}`} className="group flex min-h-11 flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6">
                <time dateTime={article.published} className="shrink-0 text-xs tabular-nums text-text-subtle sm:w-28">{formatDate.format(new Date(article.published))}</time>
                <span className="min-w-0">
                  <span className="font-semibold text-foreground transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{article.title}</span>
                  <span className="mt-1 hidden text-sm leading-relaxed text-text-secondary sm:block">{article.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/writing" className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 dark:text-indigo-300">
          All articles <AnimatedArrow />
        </Link>
      </div>
    </section>
  );
}
