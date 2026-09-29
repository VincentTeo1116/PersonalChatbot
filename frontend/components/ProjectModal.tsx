"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import ProjectMedia from "@/components/ProjectMedia";

export type PreviewItem = {
  title: string;
  description: string;
  tags?: string[];
  image: string;
  screenshots?: string[];
  demoVideoUrl?: string;
  links: { label: string; url: string }[];
  /** Link to a full write-up page, e.g. `/projects/{slug}`. Omit if there isn't one
   * (research papers previewed with this same modal have no such page). */
  caseStudyHref?: string;
};

export default function ProjectModal({
  project,
  onClose,
}: {
  project: PreviewItem;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const primaryLink = project.links[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ProjectMedia
          title={project.title}
          image={project.image}
          screenshots={project.screenshots}
          demoVideoUrl={project.demoVideoUrl}
          aspectClassName="aspect-[8/5] max-h-[45dvh]"
        >
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            &times;
          </button>
        </ProjectMedia>

        <div className="overflow-y-auto p-6">
          <h3 className="font-semibold text-foreground text-lg">{project.title}</h3>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">{project.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(project.tags ?? []).map((t) => (
              <span
                key={t}
                className="rounded-full bg-surface-hover border border-border px-2.5 py-1 text-xs text-text-secondary"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
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
            {project.caseStudyHref && (
              <Link
                href={project.caseStudyHref}
                className="inline-flex items-center gap-1 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 hover:scale-105 active:scale-95"
              >
                Full case study &rarr;
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
