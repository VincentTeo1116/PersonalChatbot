"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import MagneticButton from "@/components/MagneticButton";
import SplitText from "@/components/SplitText";
import type { Profile } from "@/lib/types";

// Entrance animations are CSS (.enter-*, see globals.css) so they start at first paint instead of waiting for the JS bundle to hydrate; this just sets each element's start delay.
const delay = (seconds: number) => ({ "--enter-delay": `${seconds}s` }) as CSSProperties;

// Scroll fade/lift thresholds assume desktop's side-by-side layout, so just skip them on mobile's stacked one.
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
    <section id="top" className="relative overflow-hidden pt-24 pb-14 sm:pt-40 sm:pb-36">
      {/* Background glow */}
      <motion.div style={{ y: glowY }} className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 glow glow-indigo opacity-[var(--blob-opacity)]" />
        <div className="animate-float-slow absolute top-20 right-0 h-[380px] w-[380px] glow glow-fuchsia opacity-[var(--blob-opacity)]" />
      </motion.div>

      <motion.div
        style={{ y: isDesktop ? contentY : 0, opacity: isDesktop ? contentOpacity : 1 }}
        className="mx-auto max-w-6xl px-6 grid gap-8 sm:gap-12 sm:grid-cols-[1.2fr_0.8fr] items-center"
      >
        <div>
          <p
            style={delay(0.05)}
            className="enter-rise inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 mb-4 sm:mb-6"
          >
            {profile.location}
          </p>

          <h1 className="text-3xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
            <SplitText text={`Hi, I'm ${profile.name}.`} delay={0.15} />
            <span className="block overflow-hidden pb-[0.15em] -mb-[0.15em]">
              {/* Two layers on purpose: the outer one plays the one-off slide-in, the inner one keeps the looping gradient shimmer. Both set `animation`, so sharing an element made the slide repeat. */}
              <span style={delay(0.4)} className="enter-word block">
                <span className="block animate-gradient-x bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {profile.tagline}
                </span>
              </span>
            </span>
          </h1>

          <div>
            <p style={delay(0.45)} className="enter-rise mt-4 max-w-xl text-base text-text-secondary leading-relaxed sm:mt-6 sm:text-lg">
              {profile.heroSummary}
            </p>

            <div style={delay(0.55)} className="enter-rise mt-6 flex flex-wrap gap-3 sm:mt-10 sm:gap-4">
              <MagneticButton>
                <a
                  href="#projects"
                  className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 inline-block"
                >
                  View my work
                </a>
              </MagneticButton>
              <MagneticButton>
                <button
                  type="button"
                  // The widget script attaches itself to window.portfolioChatbot once loaded.
                  onClick={() =>
                    (window as unknown as { portfolioChatbot?: { open?: () => void } }).portfolioChatbot?.open?.()
                  }
                  className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-foreground/5 active:scale-95 inline-block"
                >
                  Chat with my AI assistant {"↓"}
                </button>
              </MagneticButton>
              {profile.contact.linkedin && (
                <div className="hidden sm:block">
                <MagneticButton>
                  <a
                    href={profile.contact.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-foreground/5 active:scale-95 inline-block"
                  >
                    Connect on LinkedIn
                  </a>
                </MagneticButton>
                </div>
              )}
            </div>

            <p style={delay(0.65)} className="enter-rise mt-6 hidden text-xs text-text-subtle sm:block">
              Press{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-text-secondary">{"⌘K"}</kbd>{" "}
              to search, or open the terminal in the corner {"↙"}
            </p>
          </div>
        </div>

        <div style={delay(0.2)} className="enter-slide">
          <div
            className="relative mx-auto w-32 sm:w-72"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute -inset-8 rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.5),rgba(217,70,239,0.22)_65%,transparent)]" />
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
                sizes="(min-width: 640px) 288px, 128px"
                priority
              />
            </motion.div>
          </div>
        </div>
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
