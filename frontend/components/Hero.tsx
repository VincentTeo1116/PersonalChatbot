"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import Reveal from "@/components/Reveal";
import MagneticButton from "@/components/MagneticButton";
import SplitText from "@/components/SplitText";
import type { Profile } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.85 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** Below `sm`, the hero grid stacks into one column, so the avatar sits well below the
 * hero text -- much lower than on desktop's side-by-side layout. The fixed scroll-pixel
 * thresholds below assume the desktop height, so on mobile the fade-out finishes before
 * the avatar has even scrolled into view. Disable the scroll fade/lift there entirely. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export default function Hero({ profile }: { profile: Profile }) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 150, damping: 15 });
  const springRotateY = useSpring(rotateY, { stiffness: 150, damping: 15 });
  const isDesktop = useIsDesktop();

  // Scroll-linked parallax: the glow drifts slower than the page, the content eases up and fades.
  const { scrollY } = useScroll();
  const glowY = useTransform(scrollY, [0, 700], [0, 200]);
  const contentY = useTransform(scrollY, [0, 500], [0, 80]);
  const contentOpacity = useTransform(scrollY, [0, 420], [1, 0]);

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
    <section id="top" className="relative overflow-hidden pt-32 pb-28 sm:pt-40 sm:pb-36">
      {/* Background glow */}
      <motion.div style={{ y: glowY }} className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-indigo-600 opacity-[var(--blob-opacity)] blur-[120px]" />
        <div className="animate-float-slow absolute top-20 right-0 h-[380px] w-[380px] rounded-full bg-fuchsia-500 opacity-[var(--blob-opacity)] blur-[100px]" />
      </motion.div>

      <motion.div
        style={{ y: isDesktop ? contentY : 0, opacity: isDesktop ? contentOpacity : 1 }}
        className="mx-auto max-w-6xl px-6 grid gap-12 sm:grid-cols-[1.2fr_0.8fr] items-center"
      >
        <div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.6, ease: EASE }}
            className="inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-500 dark:text-indigo-300 mb-6"
          >
            {profile.location}
          </motion.p>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
            <SplitText text={`Hi, I'm ${profile.name}.`} delay={0.15} />
            <span className="block overflow-hidden pb-[0.15em] -mb-[0.15em]">
              <motion.span
                className="block animate-gradient-x bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent"
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.85, ease: EASE, delay: 0.6 }}
              >
                {profile.tagline}
              </motion.span>
            </span>
          </h1>

          <motion.div variants={container} initial="hidden" animate="show">
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
        </div>

        <Reveal delay={200} direction="right">
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
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        aria-hidden
        style={{ opacity: contentOpacity }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-text-subtle sm:flex"
      >
        <span className="text-[10px] uppercase tracking-[0.25em]">Scroll</span>
        <span className="relative h-9 w-5 rounded-full border border-border">
          <motion.span
            className="absolute left-1/2 top-1.5 h-1.5 w-1 -translate-x-1/2 rounded-full bg-indigo-400"
            animate={{ y: [0, 14, 0], opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  );
}
