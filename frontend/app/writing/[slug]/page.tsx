import Link from "next/link";
import { notFound } from "next/navigation";
import ContentShell from "@/components/ContentShell";
import { articles, getArticle } from "@/lib/writing";
import { absoluteUrl, contentMetadata, jsonLdString, SITE_URL } from "@/lib/seo";
import { getProfile } from "@/lib/data";

export function generateStaticParams() { return articles.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const meta = contentMetadata(`${article.title} | Vincent Teo`, article.description, `/writing/${article.slug}`);
  const images = [absoluteUrl(`/writing/${article.slug}/opengraph-image`)];
  return { ...meta, openGraph: { ...meta.openGraph, type: "article" as const, publishedTime: article.published, modifiedTime: article.updated, images }, twitter: { ...meta.twitter, images } };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  const profile = await getProfile();
  const url = absoluteUrl(`/writing/${article.slug}`);
  const data = {
    "@context": "https://schema.org", "@graph": [
      { "@type": "BlogPosting", headline: article.title, description: article.description, url, mainEntityOfPage: url,
        datePublished: article.published, dateModified: article.updated, inLanguage: "en",
        author: { "@type": "Person", "@id": `${SITE_URL}/#person`, name: profile.name, url: SITE_URL },
        image: absoluteUrl(`/writing/${article.slug}/opengraph-image`),
      },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Portfolio", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Writing", item: absoluteUrl("/writing") },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ] },
    ],
  };
  return (
    <ContentShell eyebrow="Engineering notes" title={article.title} intro={article.description}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
      <p className="mt-5 text-sm text-text-subtle">By <Link href="/#about" className="underline underline-offset-4">{profile.name}</Link> · Updated <time dateTime={article.updated}>{article.updated}</time></p>
      <nav aria-label="Article sections" className="mt-8 flex flex-wrap gap-3 text-sm text-indigo-600 dark:text-indigo-300">
        {article.sections.map((section) => <a key={section.id} href={`#${section.id}`} className="inline-flex min-h-11 items-center rounded-full border border-border px-4">{section.title}</a>)}
      </nav>
      <div className="mt-10 max-w-3xl space-y-10">
        {article.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-8">
            <h2 className="text-2xl font-semibold text-foreground">{section.title}</h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-text-secondary">{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
          </section>
        ))}
      </div>
      <aside className="mt-12 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold text-foreground">Explore the implementation</h2>
        <div className="mt-4 flex flex-wrap gap-5 text-sm font-medium text-indigo-600 dark:text-indigo-300">
          <Link href="/projects/portfolio-chatbot">RAG portfolio case study &rarr;</Link>
          {profile.contact.github && <a href={profile.contact.github} target="_blank" rel="noreferrer">Explore my GitHub &rarr;</a>}
          <Link href="/#contact">Discuss an AI project &rarr;</Link>
        </div>
        {articles.filter((other) => other.slug !== article.slug).map((other) => <Link key={other.slug} href={`/writing/${other.slug}`} className="mt-5 block text-sm text-text-secondary underline underline-offset-4">Related: {other.title}</Link>)}
      </aside>
    </ContentShell>
  );
}
