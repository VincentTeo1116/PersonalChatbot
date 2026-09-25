"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring } from "motion/react";
import Reveal from "@/components/Reveal";
import MagneticButton from "@/components/MagneticButton";
import type { Profile } from "@/lib/types";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function Hero({ profile }: { profile: Profile }) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 150, damping: 15 });
  const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(x * 12);
    rotateX.set(-y * 12);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-indigo-600 opacity-[var(--blob-opacity)] blur-[120px]" />
        <div className="animate-float-slow absolute top-20 right-0 h-[380px] w-[380px] rounded-full bg-fuchsia-500 opacity-[var(--blob-opacity)] blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 grid gap-12 sm:grid-cols-[1.2fr_0.8fr] items-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.p
            variants={item}
            className="inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-500 dark:text-indigo-300 mb-6"
          >
            {profile.location}
          </motion.p>

          <motion.h1
            variants={item}
            className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.05]"
          >
            Hi, I&apos;m {profile.name}.
            <br />
            <span className="animate-gradient-x bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              {profile.tagline}
            </span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-xl text-lg text-text-secondary leading-relaxed">
            {profile.heroSummary}
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-wrap gap-4">
            <MagneticButton>
              <a
                href="#projects"
                className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 inline-block"
              >
                View my work
              </a>
            </MagneticButton>
            <MagneticButton>
              <a
                href="#contact"
                className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-foreground/5 active:scale-95 inline-block"
              >
                Chat with my AI assistant {"↓"}
              </a>
            </MagneticButton>
          </motion.div>

          <motion.p variants={item} className="mt-6 text-xs text-text-subtle">
            Press{" "}
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-text-secondary">{"⌘K"}</kbd>{" "}
            to search, or open the terminal in the corner {"↙"}
          </motion.p>
        </motion.div>

        <Reveal delay={200}>
          <div
            className="relative mx-auto w-56 sm:w-72"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 blur-2xl opacity-40" />
            <motion.div
              style={{ rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 800 }}
              whileHover={{ scale: 1.03 }}
              transition={{ scale: { type: "spring", stiffness: 200, damping: 15 } }}
            >
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                width={400}
                height={400}
                className="relative rounded-3xl border border-border shadow-2xl"
                priority
              />
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
