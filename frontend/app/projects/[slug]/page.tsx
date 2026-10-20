import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectMedia from "@/components/ProjectMedia";
import ThemeToggle from "@/components/ThemeToggle";
import { getProfile, getProjects } from "@/lib/data";
import { SITE_URL, absoluteUrl, jsonLdString } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);
  const project = projects.find((p) => p.slug === slug);
  if (!project) return { title: "Project not found" };

  const title = `${project.title} | ${profile.name}'s AI & Web Development Portfolio`;
  const description = project.description.length > 150
    ? `${project.description.slice(0, 147).replace(/\s+\S*$/, "").trimEnd()}…`
    : project.description;

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
        ...(repoLink && { codeRepositoryUrl: repoLink.url }),
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

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{project.title}</h1>
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
      </article>
    </main>
  );
}
