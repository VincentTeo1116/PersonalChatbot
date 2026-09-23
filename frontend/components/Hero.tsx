import Image from "next/image";
import { profile } from "@/data/profile";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-indigo-600/30 blur-[120px]" />
        <div className="absolute top-20 right-0 h-[380px] w-[380px] rounded-full bg-fuchsia-500/20 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 grid gap-12 sm:grid-cols-[1.2fr_0.8fr] items-center">
        <div>
          <p className="inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-6">
            {profile.location}
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.05]">
            Hi, I&apos;m {profile.name}.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              {profile.tagline}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300 leading-relaxed">{profile.heroSummary}</p>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#projects"
              className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
            >
              View my work
            </a>
            <a
              href="#contact"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Chat with my AI assistant {"↓"}
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-56 sm:w-72">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 blur-2xl opacity-40" />
          <Image
            src="/avatar-placeholder.svg"
            alt={profile.name}
            width={400}
            height={400}
            className="relative rounded-3xl border border-white/10 shadow-2xl"
            priority
          />
        </div>
      </div>
    </section>
  );
}
