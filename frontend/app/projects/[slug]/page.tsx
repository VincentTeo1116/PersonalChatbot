import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectMedia from "@/components/ProjectMedia";
import ThemeToggle from "@/components/ThemeToggle";
import { getProfile, getProjects } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);
  if (!project) return { title: "Project not found" };

  return {
    title: `${project.title} — Case study`,
    description: project.description,
    openGraph: {
      title: project.title,
      description: project.description,
      images: [project.image],
    },
  };
}

export default async function ProjectCaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const primaryLink = project.links[0];

  return (
    <main className="flex-1">
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
              <span className="rounded-full bg-indigo-500/90 px-2.5 py-1 text-xs font-medium text-white">Featured</span>
            )}
            {project.award && (
              <span className="rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white">{project.award}</span>
            )}
          </div>
        )}

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{project.title}</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span key={t} className="rounded-full bg-surface-hover border border-border px-2.5 py-1 text-xs text-text-secondary">
              {t}
            </span>
          ))}
        </div>

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
