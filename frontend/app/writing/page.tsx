import Link from "next/link";
import ContentShell from "@/components/ContentShell";
import { articles } from "@/lib/writing";
import { contentMetadata } from "@/lib/seo";
import AnimatedArrow from "@/components/AnimatedArrow";

export const metadata = contentMetadata("AI & Software Engineering Notes | Vincent Teo", "Implementation notes on RAG architecture, retrieval evaluation, and building practical AI applications with software engineering discipline.", "/writing");

export default function WritingIndex() {
  return (
    <ContentShell eyebrow="Engineering notes" title="Decisions behind the code" intro="Practical notes from building this portfolio's AI assistant: how the pieces fit together, what the checks measure, and where the limitations are.">
      <div className="mt-12 space-y-8">
        {articles.map((article) => (
          <section key={article.slug} className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-2xl font-semibold leading-snug text-foreground"><Link href={`/writing/${article.slug}`} className="hover:text-indigo-500">{article.title}</Link></h2>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">{article.description}</p>
            <Link href={`/writing/${article.slug}`} className="mt-4 inline-flex min-h-11 items-center font-medium text-indigo-600 dark:text-indigo-300">Read the implementation notes <AnimatedArrow /></Link>
          </section>
        ))}
      </div>
    </ContentShell>
  );
}
