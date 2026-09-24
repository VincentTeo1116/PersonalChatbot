"use client";

import { useRef } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { profile } from "@/data/profile";

export default function Hero() {
  const avatarRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = avatarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.03)`;
  };

  const handleMouseLeave = () => {
    const el = avatarRef.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)";
  };

  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-indigo-600 opacity-[var(--blob-opacity)] blur-[120px]" />
        <div className="animate-float-slow absolute top-20 right-0 h-[380px] w-[380px] rounded-full bg-fuchsia-500 opacity-[var(--blob-opacity)] blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 grid gap-12 sm:grid-cols-[1.2fr_0.8fr] items-center">
        <div>
          <Reveal>
            <p className="inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-500 dark:text-indigo-300 mb-6">
              {profile.location}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
              Hi, I&apos;m {profile.name}.
              <br />
              <span className="animate-gradient-x bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {profile.tagline}
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-lg text-text-secondary leading-relaxed">{profile.heroSummary}</p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#projects"
                className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-400 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
              >
                View my work
              </a>
              <a
                href="#contact"
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-foreground/5 hover:scale-105 active:scale-95"
              >
                Chat with my AI assistant {"↓"}
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <p className="mt-6 text-xs text-text-subtle">
              Press{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-text-secondary">{"⌘K"}</kbd>{" "}
              to search, or open the terminal in the corner {"↙"}
            </p>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div
            className="relative mx-auto w-56 sm:w-72"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 blur-2xl opacity-40" />
            <div ref={avatarRef} className="transition-transform duration-300 ease-out [transform-style:preserve-3d]">
              <Image
                src="/avatar-placeholder.svg"
                alt={profile.name}
                width={400}
                height={400}
                className="relative rounded-3xl border border-border shadow-2xl"
                priority
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
