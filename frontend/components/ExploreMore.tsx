import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import AnimatedArrow from "@/components/AnimatedArrow";

export default function ExploreMore() {
  return (
    <section id="explore" className="border-y border-border bg-surface/50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Go deeper" title="The thinking behind the work" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/ai-lab", title: "AI evaluation lab", text: "Try the assistant, inspect its sources, and see a real retrieval test and ranking miss." },
            { href: "/research", title: "Research", text: "Machine learning methods, publication details, and links to the original work." },
            { href: "/writing", title: "Engineering notes", text: "How the RAG assistant works, how retrieval is evaluated, and what can be improved." },
            { href: "/services", title: "Web development", text: "Explore the applications I build and discuss a website or AI integration." },
          ].map(({ href, title, text }) => (
            <Link key={href} href={href} className="rounded-2xl border border-border bg-background p-6 transition-colors hover:border-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500">
              <h3 className="text-lg font-semibold text-foreground">{title} <AnimatedArrow /></h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
