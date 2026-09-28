"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useSpring } from "motion/react";

/** A vertical timeline whose gradient line draws itself as you scroll past it. */
export function Timeline({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 28 });

  return (
    <ol ref={ref} className={`relative border-l border-border pl-6 ${className}`}>
      <motion.span
        aria-hidden
        style={{ scaleY }}
        className="absolute -left-px top-0 h-full w-px origin-top bg-gradient-to-b from-indigo-400 to-fuchsia-400"
      />
      {children}
    </ol>
  );
}

/** One entry: slides in from the left, and its dot pops in with a spring. */
export function TimelineItem({ children, index = 0 }: { children: ReactNode; index?: number }) {
  const delay = index * 0.08;

  return (
    <motion.li
      initial={{ opacity: 0, x: -28 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay }}
      className="group relative"
    >
      <motion.span
        aria-hidden
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ type: "spring", stiffness: 420, damping: 14, delay: delay + 0.15 }}
        className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-indigo-400 ring-4 ring-indigo-400/20 animate-pulse-ring"
      />
      <div className="transition-transform duration-300 group-hover:translate-x-1">{children}</div>
    </motion.li>
  );
}
