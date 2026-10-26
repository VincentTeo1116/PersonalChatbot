"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import MagneticButton from "@/components/MagneticButton";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import type { Profile } from "@/lib/types";

// Loaded on first open: most visitors never open it, so it shouldn't be in the initial bundle.
const ResumeModal = dynamic(() => import("@/components/ResumeModal"));

const OUTLINE_BUTTON =
  "inline-block rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-foreground/10 active:scale-95";

export default function Contact({ profile }: { profile: Profile }) {
  const [resumeOpen, setResumeOpen] = useState(false);

  // The phone action bar opens the resume through this event, so there is one modal for every trigger.
  useEffect(() => {
    const open = () => setResumeOpen(true);
    window.addEventListener("portfolio:open-resume", open);
    return () => window.removeEventListener("portfolio:open-resume", open);
  }, []);

  return (
    <section id="contact" className="relative overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float-slow absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 glow glow-indigo opacity-[var(--blob-opacity)]" />
        <div className="animate-float absolute left-1/4 top-1/3 h-[240px] w-[240px] glow glow-fuchsia opacity-[var(--blob-opacity)]" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Contact" title="Let's work together">
          <p className="mt-4 max-w-2xl text-text-secondary">
            Open to opportunities, collaborations, or just a chat about AI engineering. Reach out
            through any of the channels below, or use the chat assistant in the corner.
          </p>
          {profile.availability && (
            <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {profile.availability}
            </span>
          )}
        </SectionHeading>

        <div className="mt-10 flex flex-wrap gap-4">
          <Reveal delay={0} direction="up">
            <MagneticButton>
              <a
                href={`mailto:${profile.contact.email}`}
                className="inline-block rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
              >
                {profile.contact.email}
              </a>
            </MagneticButton>
          </Reveal>
          <Reveal delay={50} direction="up">
            <MagneticButton>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("portfolio:open-meeting-request"))}
                className="inline-block rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
              >
                Request a meeting
              </button>
            </MagneticButton>
          </Reveal>
          {profile.contact.github && (
            <Reveal delay={100} direction="up">
              <MagneticButton>
                <a href={profile.contact.github} target="_blank" rel="noreferrer" className={OUTLINE_BUTTON}>
                  GitHub
                </a>
              </MagneticButton>
            </Reveal>
          )}
          <Reveal delay={150} direction="up">
            <MagneticButton>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("portfolio:open-testimonial-request"))}
                className={OUTLINE_BUTTON}
              >
                Leave a testimonial
              </button>
            </MagneticButton>
          </Reveal>
          <Reveal delay={200} direction="up">
            <MagneticButton>
              <a href={profile.contact.linkedin} target="_blank" rel="noreferrer" className={OUTLINE_BUTTON}>
                LinkedIn
              </a>
            </MagneticButton>
          </Reveal>
          {profile.contact.resumeUrl && (
            <Reveal delay={300} direction="up">
              <MagneticButton>
                <button type="button" data-analytics-event="resume_open" onClick={() => setResumeOpen(true)} className={OUTLINE_BUTTON}>
                  Resume
                </button>
              </MagneticButton>
            </Reveal>
          )}
        </div>

        <p className="mt-20 text-xs text-text-subtle">
          Built with Next.js &amp; Tailwind CSS. © {new Date().getFullYear()} Vincent Teo Kai Qi. All rights reserved.
        </p>
      </div>

      <AnimatePresence>
        {resumeOpen && profile.contact.resumeUrl && (
          <ResumeModal resumeUrl={profile.contact.resumeUrl} onClose={() => setResumeOpen(false)} />
        )}
      </AnimatePresence>
    </section>
  );
}
