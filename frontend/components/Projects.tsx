"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence } from "motion/react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import TiltCard from "@/components/TiltCard";
import ProjectModal from "@/components/ProjectModal";
import type { Project } from "@/lib/types";

export default function Projects({ projects }: { projects: Project[] }) {
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const previewProject = projects.find((p) => p.slug === previewSlug) ?? null;

  return (
    <section id="projects" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Projects" title="Things I've built" />

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {projects.map((p, i) => {
            const previewable = (p.screenshots?.length ?? 0) > 0 || !!p.demoVideoUrl;
            return (
              <Reveal key={p.slug} delay={i * 80} direction={i % 2 === 0 ? "left" : "right"}>
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
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {p.featured && (
                      <span className="absolute top-3 left-3 rounded-full bg-indigo-500/90 px-2.5 py-1 text-xs font-medium text-white">
                        Featured
                      </span>
                    )}
                    {p.award && (
                      <span className="absolute top-3 left-3 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-white">
                        {p.award}
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-foreground text-lg">{p.title}</h3>
                    <p className="mt-2 text-sm text-text-secondary leading-relaxed">{p.description}</p>
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
                    {p.links.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-4">
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
                    )}
                  </div>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {previewProject && <ProjectModal project={previewProject} onClose={() => setPreviewSlug(null)} />}
      </AnimatePresence>
    </section>
  );
}
