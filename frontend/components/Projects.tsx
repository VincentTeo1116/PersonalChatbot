"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import TiltCard from "@/components/TiltCard";
import type { Project } from "@/lib/types";

// Loaded on first open: most visitors never open it, so it shouldn't be in the initial bundle.
const ProjectModal = dynamic(() => import("@/components/ProjectModal"));

// Collapsed view shows the featured projects first, then fills up to this many (one fewer on phones).
const COLLAPSED_COUNT = 4;

export default function Projects({ projects }: { projects: Project[] }) {
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const shownSlugs = [...projects]
    .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
    .slice(0, COLLAPSED_COUNT)
    .map((p) => p.slug);
  const hiddenCount = projects.length - shownSlugs.length;

  // A deep link (#project-<slug>) or palette jump to a collapsed project has to open the list first.
  useEffect(() => {
    const reveal = (slug: string) => {
      if (document.getElementById(`project-${slug}`)?.offsetParent === null) setExpanded(true);
    };
    const fromHash = () => {
      const m = window.location.hash.match(/^#project-(.+)$/);
      if (m) reveal(m[1]);
    };
    const fromEvent = (e: Event) => reveal(String((e as CustomEvent).detail).replace(/^project-/, ""));
    fromHash();
    window.addEventListener("hashchange", fromHash);
    window.addEventListener("portfolio:reveal-project", fromEvent);
    return () => {
      window.removeEventListener("hashchange", fromHash);
      window.removeEventListener("portfolio:reveal-project", fromEvent);
    };
  }, []);

  function toggle() {
    setExpanded((open) => !open);
    if (expanded) document.getElementById("projects")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const previewProject = projects.find((p) => p.slug === previewSlug) ?? null;

  return (
    <section id="projects" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Projects" title="Things I've built" />

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {projects.map((p, i) => {
            const previewable = (p.screenshots?.length ?? 0) > 0 || !!p.demoVideoUrl;
            const rank = shownSlugs.indexOf(p.slug);
            // Collapsed: the last shown card is desktop-only so phones see one fewer; the rest are hidden.
            const visibility = expanded || (rank >= 0 && rank < COLLAPSED_COUNT - 1)
              ? ""
              : rank === COLLAPSED_COUNT - 1 ? "hidden sm:block" : "hidden";
            return (
              <Reveal key={p.slug} className={visibility} delay={i * 80} direction={i % 2 === 0 ? "left" : "right"}>
                <TiltCard
                  id={`project-${p.slug}`}
                  className="group h-full scroll-mt-24 rounded-2xl border border-border bg-surface overflow-hidden transition-colors duration-300 hover:border-indigo-400/40 hover:shadow-2xl hover:shadow-indigo-500/10 target:border-indigo-400/70 target:ring-2 target:ring-indigo-400/40"
                >
                  <div
                    className={`relative aspect-[8/5] overflow-hidden ${previewable ? "cursor-pointer" : ""}`}
                    onClick={previewable ? () => setPreviewSlug(p.slug) : undefined}
                  >
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      sizes="(min-width: 1152px) 536px, (min-width: 640px) calc(50vw - 40px), calc(100vw - 48px)"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {p.featured && (
                      <span className="absolute top-3 left-3 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white">
                        Featured
                      </span>
                    )}
                    {p.award && (
                      <span className="absolute top-3 left-3 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-medium text-amber-950">
                        {p.award}
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-foreground text-lg">
                      <Link href={`/projects/${p.slug}`} className="transition-colors hover:text-indigo-500 dark:hover:text-indigo-300">
                        {p.title}
                      </Link>
                    </h3>
                    <p className="mt-2 line-clamp-4 text-sm text-text-secondary leading-relaxed">{p.description}</p>
                    {p.impact && (
                      <p className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-300">{p.impact}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-surface-hover border border-border px-2.5 py-1 text-xs text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-4">
                      <Link
                        href={`/projects/${p.slug}`}
                        className="group/link inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-300 transition-colors hover:text-indigo-500 dark:hover:text-indigo-200"
                      >
                        Case study
                        <span className="transition-transform duration-200 group-hover/link:translate-x-0.5">&rarr;</span>
                      </Link>
                      {p.links.map((l) => (
                        <a
                          key={l.label}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group/link inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-300 transition-colors hover:text-indigo-500 dark:hover:text-indigo-200"
                        >
                          {l.label}
                          <span className="transition-transform duration-200 group-hover/link:translate-x-0.5">
                            &rarr;
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>

        {hiddenCount > 0 && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={expanded}
              className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 active:scale-95"
            >
              {expanded ? "Show fewer projects" : `Show all ${projects.length} projects`}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewProject && (
          <ProjectModal
            project={{ ...previewProject, caseStudyHref: `/projects/${previewProject.slug}` }}
            onClose={() => setPreviewSlug(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
