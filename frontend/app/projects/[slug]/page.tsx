import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectMedia from "@/components/ProjectMedia";
import ThemeToggle from "@/components/ThemeToggle";
import { getProfile, getProjects } from "@/lib/data";
import { SITE_URL, absoluteUrl, jsonLdString, metaDescription } from "@/lib/seo";
import { CASE_STUDY_SECTIONS } from "@/lib/project-case-study";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const title = `${project.seoTitle || project.title} | ${profile.name}`;
  const description = metaDescription(project.seoDescription || project.description);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/projects/${project.slug}` },
    openGraph: {
      type: "article",
      url: `${SITE_URL}/projects/${project.slug}`,
      title,
      description,
      modifiedTime: project.updatedAt,
      tags: project.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProjectCaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const primaryLink = project.links[0];
  const repoLink = project.links.find((l) => /github\.com/i.test(l.url));
  const projectUrl = `${SITE_URL}/projects/${project.slug}`;
  const sections = CASE_STUDY_SECTIONS.filter(({ key }) => project.caseStudy?.[key]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": repoLink ? "SoftwareSourceCode" : "CreativeWork",
        "@id": `${projectUrl}#project`,
        name: project.title,
        description: project.description,
        url: projectUrl,
        image: absoluteUrl(project.image),
        keywords: project.tags.join(", "),
        dateModified: project.updatedAt,
        author: { "@id": `${SITE_URL}/#person` },
        ...(repoLink && { codeRepository: repoLink.url }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: `${profile.name}'s Portfolio`, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Projects", item: `${SITE_URL}/#projects` },
          { "@type": "ListItem", position: 3, name: project.title, item: projectUrl },
        ],
      },
    ],
  };

  return (
    <main className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-8">
        <Link href="/#projects" className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground">
          &larr; Back to {profile.name}&apos;s portfolio
        </Link>
        <ThemeToggle />
      </header>

      <article className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <ProjectMedia
            title={project.title}
            image={project.image}
            screenshots={project.screenshots}
            demoVideoUrl={project.demoVideoUrl}
            aspectClassName="aspect-[16/9]"
          />
        </div>

        {(project.featured || project.award) && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {project.featured && (
              <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white">Featured</span>
            )}
            {project.award && (
              <span className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-medium text-amber-950">{project.award}</span>
            )}
          </div>
        )}

        <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Engineering case study</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{project.seoTitle || project.title}</h1>
        {project.role && <p className="mt-1 text-sm text-text-subtle">{project.role}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-hover border border-border px-2.5 py-1 text-xs text-text-secondary">
              {t}
            </span>
          ))}
        </div>

        {project.impact && (
          <p className="mt-6 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-base font-medium text-indigo-600 dark:text-indigo-300">
            {project.impact}
          </p>
        )}

        <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-text-secondary">{project.description}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          {primaryLink && (
            <a
              href={primaryLink.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-400 hover:scale-105 active:scale-95"
            >
              {primaryLink.label} &rarr;
            </a>
          )}
          {project.links.slice(1).map((l) => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 hover:scale-105 active:scale-95"
            >
              {l.label}
            </a>
          ))}
        </div>

        {sections.length > 0 && (
          <>
            <nav aria-label="Case study sections" className="mt-10 rounded-2xl border border-border bg-surface p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">Explore the engineering</p>
              <div className="flex flex-wrap gap-2">
                {sections.map(({ key, title }) => (
                  <a key={key} href={`#${key}`} className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm text-text-secondary transition-colors hover:border-indigo-400 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">{title}</a>
                ))}
              </div>
            </nav>
            <div className="mt-12 space-y-12">
              {sections.map(({ key, title }, index) => (
                <section key={key} id={key} aria-labelledby={`${key}-heading`} className="scroll-mt-24 border-t border-border pt-7">
                  <p aria-hidden="true" className="mb-2 font-mono text-xs text-indigo-600 dark:text-indigo-300">{String(index + 1).padStart(2, "0")}</p>
                  <h2 id={`${key}-heading`} className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
                  <div className="mt-4 space-y-4 text-base leading-relaxed text-text-secondary">
                    {project.caseStudy![key]!.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex} className="whitespace-pre-line">{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        <aside className="mt-14 rounded-2xl border border-indigo-400/30 bg-indigo-500/5 p-6">
          <h2 className="text-lg font-semibold text-foreground">Discuss this project</h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">Interested in the implementation, an opportunity, or building something together?</p>
          <Link href="/#contact" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500">Get in touch &rarr;</Link>
        </aside>
      </article>
    </main>
  );
}
