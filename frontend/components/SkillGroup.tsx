"use client";

import { motion } from "motion/react";
import type { SkillItem } from "@/lib/types";

const group = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const pill = {
  hidden: { opacity: 0, scale: 0.7, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 20 } },
};

const MAX_LEVEL = 5;

/** Five small dots showing proficiency (filled up to `level`, out of 5). */
function ProficiencyDots({ level }: { level: number }) {
  const clamped = Math.max(0, Math.min(MAX_LEVEL, Math.round(level)));
  return (
    <span className="ml-1.5 inline-flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: MAX_LEVEL }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < clamped ? "bg-indigo-400" : "bg-border"}`}
        />
      ))}
    </span>
  );
}

/** One skill category: its pills pop in one by one, then bounce on hover. Each pill
 * carries a small proficiency-dot rating next to the skill name. */
export default function SkillGroup({ category, items }: { category: string; items: SkillItem[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">{category}</p>
      <motion.div
        className="flex flex-wrap gap-2"
        variants={group}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
      >
        {items.map((item) => (
          <motion.span
            key={item.name}
            variants={pill}
            whileHover={{ y: -4, scale: 1.08 }}
            title={`${item.name} — ${item.level}/${MAX_LEVEL}`}
            className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-secondary transition-colors duration-200 hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-foreground"
          >
            {item.name}
            <ProficiencyDots level={item.level} />
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
