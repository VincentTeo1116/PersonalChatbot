import Link from "next/link";
import ContentShell from "@/components/ContentShell";
import { getProfile, getResearch } from "@/lib/data";
import { contentMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata() {
  const profile = await getProfile();
  return contentMetadata(`AI & Machine Learning Research | ${profile.name}`, "Explore Vincent Teo's research in machine learning, forecasting, and explainable AI, with publication details and links to the original papers.", "/research");
}

export default async function ResearchIndex() {
  const papers = await getResearch();
  return (
    <ContentShell eyebrow="Research" title="Machine learning research, explained" intro="Explore the research questions, methods, and published work behind my AI projects.">
      <div className="mt-12 space-y-8">
        {papers.map((paper) => (
          <section key={paper.slug} className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-indigo-600 dark:text-indigo-300">{paper.venue}</p>
            <h2 className="mt-2 text-xl font-semibold leading-snug text-foreground"><Link href={`/research/${paper.slug}`} className="hover:text-indigo-500">{paper.seoTitle || paper.title}</Link></h2>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">{paper.description}</p>
            <Link href={`/research/${paper.slug}`} className="mt-4 inline-flex min-h-11 items-center font-medium text-indigo-600 dark:text-indigo-300">Explore the research &rarr;</Link>
          </section>
        ))}
      </div>
    </ContentShell>
  );
}
