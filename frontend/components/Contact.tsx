"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import MagneticButton from "@/components/MagneticButton";
import Reveal from "@/components/Reveal";
import ResumeModal from "@/components/ResumeModal";
import SectionHeading from "@/components/SectionHeading";
import type { Profile } from "@/lib/types";

const OUTLINE_BUTTON =
  "inline-block rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-foreground/10 active:scale-95";

export default function Contact({ profile }: { profile: Profile }) {
  const [resumeOpen, setResumeOpen] = useState(false);

  return (
    <section id="contact" className="relative overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float-slow absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500 opacity-[var(--blob-opacity)] blur-[120px]" />
        <div className="animate-float absolute left-1/4 top-1/3 h-[240px] w-[240px] rounded-full bg-fuchsia-500 opacity-[var(--blob-opacity)] blur-[100px]" />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center">
        <SectionHeading eyebrow="Contact" title="Let's work together" align="center" large>
          <p className="mt-4 text-text-secondary">
            Open to opportunities, collaborations, or just a chat about AI engineering. Reach out
            through any of the channels below, or use the chat assistant in the corner.
          </p>
        </SectionHeading>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
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
                <button type="button" onClick={() => setResumeOpen(true)} className={OUTLINE_BUTTON}>
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
