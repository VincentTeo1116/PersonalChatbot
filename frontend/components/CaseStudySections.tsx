import { CASE_STUDY_SECTIONS, type ProjectCaseStudy } from "@/lib/project-case-study";

export default function CaseStudySections({ value }: { value?: ProjectCaseStudy }) {
  const sections = CASE_STUDY_SECTIONS.flatMap((section) => {
    const text = value?.[section.key];
    return text ? [{ ...section, text }] : [];
  });
  if (!sections.length) return null;
  return (
    <div className="mt-10 space-y-10">
      <nav aria-label="Research sections" className="flex flex-wrap gap-2">
        {sections.map(({ key, title }) => <a key={key} href={`#${key}`} className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm text-text-secondary hover:text-foreground">{title}</a>)}
      </nav>
      {sections.map(({ key, title, text }) => (
        <section key={key} id={key} aria-labelledby={`${key}-title`} className="scroll-mt-8 border-t border-border pt-6">
          <h2 id={`${key}-title`} className="text-2xl font-semibold text-foreground">{title}</h2>
          <div className="mt-4 max-w-3xl space-y-4 text-base leading-relaxed text-text-secondary">
            {text.split(/\n\s*\n/).filter((p) => p.trim()).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
          </div>
        </section>
      ))}
    </div>
  );
}
