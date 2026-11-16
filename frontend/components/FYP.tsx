"use client";

import Reveal from "@/components/Reveal";
import PartHeading from "@/components/PartHeading";
import ProjectMedia from "@/components/ProjectMedia";
import type { Fyp } from "@/lib/types";
import AnimatedArrow from "@/components/AnimatedArrow";

export default function FYP({ fyp }: { fyp: Fyp | null }) {
  const hasContent = Boolean(fyp?.title);

  return (
    <div id="fyp" className="mt-16 scroll-mt-24">
      <div>
        <PartHeading number="02" title="Final year project" />

        {!hasContent || !fyp ? (
          <Reveal delay={80}>
            <div className="mt-8 flex flex-col items-start justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-8 sm:px-8">
              <p className="text-lg font-medium text-foreground">Coming soon</p>
              <p className="max-w-md text-sm text-text-subtle">
                The Final Year Project writeup is still in progress -- check back later for the title, approach, and demo.
              </p>
            </div>
          </Reveal>
        ) : (
          <Reveal delay={80}>
            <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
              <ProjectMedia
                title={fyp.title ?? "Final Year Project"}
                image="/projects/placeholder.svg"
                screenshots={fyp.images.length > 0 ? fyp.images.map((img) => img.src) : undefined}
                demoVideoUrl={fyp.videoUrl ?? undefined}
                aspectClassName="aspect-[16/9]"
              />

              <div className="p-6 sm:p-8">
                <h4 className="text-xl font-semibold text-foreground">{fyp.title}</h4>
                {fyp.supervisor && (
                  <p className="mt-1 text-xs text-text-subtle">Supervised by {fyp.supervisor}</p>
                )}
                {fyp.description && (
                  <p className="mt-4 text-sm leading-relaxed text-text-secondary whitespace-pre-line">
                    {fyp.description}
                  </p>
                )}

                {fyp.datasetDescription && (
                  <div className="mt-6">
                    <h5 className="text-sm font-semibold text-foreground">Dataset</h5>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary whitespace-pre-line">
                      {fyp.datasetDescription}
                    </p>
                  </div>
                )}

                {fyp.lecturerFeedback && (
                  <div className="mt-6 rounded-xl border border-border bg-background p-4">
                    <h5 className="text-sm font-semibold text-foreground">Lecturer feedback</h5>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary italic whitespace-pre-line">
                      &ldquo;{fyp.lecturerFeedback}&rdquo;
                    </p>
                  </div>
                )}

                {fyp.githubUrl && (
                  <div className="mt-6">
                    <a
                      href={fyp.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group/link inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-300 transition-colors hover:text-indigo-500 dark:hover:text-indigo-200"
                    >
                      View repository on GitHub
                      <AnimatedArrow direction="up-right" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
