import Reveal from "@/components/Reveal";
import type { Profile } from "@/lib/types";

export default function Contact({ profile }: { profile: Profile }) {
  return (
    <section id="contact" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Contact</h2>
          <p className="mt-3 text-3xl sm:text-4xl font-semibold text-foreground">Let&apos;s work together</p>
          <p className="mt-4 text-text-secondary">
            Open to opportunities, collaborations, or just a chat about AI engineering. Reach out
            through any of the channels below, or use the chat assistant in the corner.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={`mailto:${profile.contact.email}`}
              className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-400 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
            >
              {profile.contact.email}
            </a>
            {profile.contact.github && (
              <a
                href={profile.contact.github}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-foreground/10 hover:scale-105 active:scale-95"
              >
                GitHub
              </a>
            )}
            <a
              href={profile.contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-foreground/10 hover:scale-105 active:scale-95"
            >
              LinkedIn
            </a>
            {profile.contact.resumeUrl && (
              <a
                href={profile.contact.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-foreground/10 hover:scale-105 active:scale-95"
              >
                Resume
              </a>
            )}
          </div>
        </Reveal>

        <p className="mt-20 text-xs text-text-subtle">
          Built with Next.js &amp; Tailwind CSS. Assistant powered by Gemini + Pinecone RAG.
        </p>
      </div>
    </section>
  );
}
