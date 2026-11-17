import Link from "next/link";
import ContentShell from "@/components/ContentShell";
import { latestArticles } from "@/lib/writing";
import { SITE_URL, absoluteUrl, contentMetadata, jsonLdString } from "@/lib/seo";
import AnimatedArrow from "@/components/AnimatedArrow";

export const metadata = contentMetadata("AI & Software Engineering Notes | Vincent Teo", "Implementation notes on RAG architecture, retrieval evaluation, and building practical AI applications with software engineering discipline.", "/writing");

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function WritingIndex() {
  const list = latestArticles();
  const url = absoluteUrl("/writing");
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${url}#blog`,
        url,
        name: "AI & Software Engineering Notes",
        inLanguage: "en",
        author: { "@id": `${SITE_URL}/#person` },
        blogPost: list.map((article) => ({
          "@type": "BlogPosting",
          headline: article.title,
          description: article.description,
          url: absoluteUrl(`/writing/${article.slug}`),
          datePublished: article.published,
          dateModified: article.updated,
          author: { "@id": `${SITE_URL}/#person` },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Portfolio", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Writing", item: url },
        ],
      },
    ],
  };

  return (
    <ContentShell eyebrow="Writing" title="The stories behind the projects" intro="Why I built each project, what went wrong along the way, and what the numbers really say.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
      <div className="mt-12 space-y-8">
        {list.length === 0 && <p className="text-text-secondary">No articles are published yet. Please check back soon.</p>}
        {list.map((article) => (
          <section key={article.slug} className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-text-subtle"><time dateTime={article.published}>{formatDate(article.published)}</time></p>
            <h2 className="mt-2 text-2xl font-semibold leading-snug text-foreground"><Link href={`/writing/${article.slug}`} className="hover:text-indigo-500">{article.title}</Link></h2>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">{article.description}</p>
            <Link href={`/writing/${article.slug}`} aria-label={`Read the article: ${article.title}`} className="mt-4 inline-flex min-h-11 items-center font-medium text-indigo-600 dark:text-indigo-300">Read the article <AnimatedArrow /></Link>
          </section>
        ))}
      </div>
    </ContentShell>
  );
}
