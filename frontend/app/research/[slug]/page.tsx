import Link from "next/link";
import { notFound } from "next/navigation";
import ContentShell from "@/components/ContentShell";
import CaseStudySections from "@/components/CaseStudySections";
import { getProfile, getResearch } from "@/lib/data";
import { absoluteUrl, contentMetadata, jsonLdString, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [papers, profile] = await Promise.all([getResearch(), getProfile()]);
  const paper = papers.find((value) => value.slug === slug);
  if (!paper) notFound();
  const meta = contentMetadata(`${paper.seoTitle || paper.title} | ${profile.name}`, paper.seoDescription || paper.description, `/research/${paper.slug}`);
  const images = [absoluteUrl(`/research/${paper.slug}/opengraph-image`)];
  return { ...meta, openGraph: { ...meta.openGraph, type: "article" as const, images, modifiedTime: paper.updatedAt }, twitter: { ...meta.twitter, images } };
}

export default async function ResearchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [papers, profile] = await Promise.all([getResearch(), getProfile()]);
  const paper = papers.find((value) => value.slug === slug);
  if (!paper) notFound();
  const url = absoluteUrl(`/research/${paper.slug}`);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ScholarlyArticle", "@id": `${url}#paper`, name: paper.title, headline: paper.title,
        description: paper.description, url, mainEntityOfPage: url, inLanguage: "en",
        image: absoluteUrl(paper.image), dateModified: paper.updatedAt,
        author: paper.authors.map((name) => ({ "@type": "Person", name, ...(name === profile.name ? { "@id": `${SITE_URL}/#person` } : {}) })),
        ...(paper.doi ? { identifier: { "@type": "PropertyValue", propertyID: "DOI", value: paper.doi } } : {}),
        ...(paper.doiUrl ? { sameAs: paper.doiUrl } : {}),
        isPartOf: { "@type": "CreativeWork", name: paper.venue },
      },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Portfolio", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Research", item: absoluteUrl("/research") },
        { "@type": "ListItem", position: 3, name: paper.title, item: url },
      ] },
    ],
  };
  return (
    <ContentShell eyebrow="Published research" title={paper.seoTitle || paper.title} intro={paper.description}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
      <section aria-label="Publication details" className="mt-8 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-text-secondary">
        <p className="font-semibold text-foreground">{paper.title}</p>
        <p className="mt-3">Authors: {paper.authors.join(", ")}</p>
        <p className="mt-2">Venue: {paper.venue}</p>
        {paper.supervisor && <p className="mt-2">Supervisor: {paper.supervisor}</p>}
        {paper.doi && <p className="mt-2 break-words">DOI: {paper.doi}</p>}
        {paper.doiUrl && <a href={paper.doiUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center font-medium text-indigo-600 dark:text-indigo-300">Read the original publication &rarr;</a>}
      </section>
      <CaseStudySections value={paper.caseStudy} />
      <div className="mt-12 flex flex-wrap gap-6 text-sm font-medium text-indigo-600 dark:text-indigo-300">
        <Link href="/research">&larr; All research</Link><Link href="/writing">Read my engineering notes &rarr;</Link><Link href="/#contact">Discuss the research &rarr;</Link>
      </div>
    </ContentShell>
  );
}
