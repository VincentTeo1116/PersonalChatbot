import Reveal from "@/components/Reveal";
import { profile } from "@/data/profile";

export default function Contact() {
  return (
    <section id="contact" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Contact</h2>
          <p className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Let&apos;s work together</p>
          <p className="mt-4 text-slate-300">
            Open to opportunities, collaborations, or just a chat about AI engineering. Reach out
            through any of the channels below, or use the chat assistant in the corner.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href={`mailto:${profile.contact.email}`}
              className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
            >
              {profile.contact.email}
            </a>
            <a
              href={profile.contact.github}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              GitHub
            </a>
            <a
              href={profile.contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </Reveal>

        <p className="mt-20 text-xs text-slate-500">
          Built with Next.js &amp; Tailwind CSS. Assistant powered by Gemini + Pinecone RAG.
        </p>
      </div>
    </section>
  );
}
