"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence } from "motion/react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import TiltCard from "@/components/TiltCard";
import ProjectModal from "@/components/ProjectModal";
import type { Publication } from "@/lib/types";

export default function Research({ research }: { research: Publication[] }) {
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const previewPaper = research.find((r) => r.slug === previewSlug) ?? null;

  if (research.length === 0) return null;

  return (
    <section id="research" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Research" title="Published work" />

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {research.map((r, i) => (
            <Reveal key={r.slug} delay={i * 80} direction={i % 2 === 0 ? "left" : "right"}>
              <TiltCard
                id={`research-${r.slug}`}
                className="group h-full scroll-mt-24 rounded-2xl border border-border bg-surface overflow-hidden transition-colors duration-300 hover:border-indigo-400/40 hover:shadow-2xl hover:shadow-indigo-500/10 target:border-indigo-400/70 target:ring-2 target:ring-indigo-400/40"
              >
                <div
                  className="relative aspect-[8/5] cursor-pointer overflow-hidden"
                  onClick={() => setPreviewSlug(r.slug)}
                >
                  <Image
                    src={r.image}
                    alt={r.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-foreground text-lg leading-snug">{r.title}</h3>
                  <p className="mt-3 text-sm text-text-secondary">
                    {r.authors.map((a, idx) => (
                      <span key={a}>
                        <span className={a === "Vincent Teo" ? "font-medium text-foreground" : ""}>{a}</span>
                        {idx < r.authors.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-xs text-text-subtle">Supervised by {r.supervisor}</p>
                  <p className="mt-3 text-sm text-text-secondary leading-relaxed">{r.description}</p>
                  <p className="mt-4 text-xs text-text-subtle">
                    {r.venue} · DOI: {r.doi}
                  </p>
                  <div className="mt-5">
                    <a
                      href={r.doiUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group/link inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-300 transition-colors hover:text-indigo-500 dark:hover:text-indigo-200"
                    >
                      Read on IEEE Xplore
                      <span className="transition-transform duration-200 group-hover/link:translate-x-0.5">
                        &rarr;
                      </span>
                    </a>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {previewPaper && (
          <ProjectModal
            project={{
              title: previewPaper.title,
              description: previewPaper.description,
              image: previewPaper.image,
              links: [{ label: "Read on IEEE Xplore", url: previewPaper.doiUrl }],
            }}
            onClose={() => setPreviewSlug(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
