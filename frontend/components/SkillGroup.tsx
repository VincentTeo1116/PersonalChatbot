"use client";

import { motion } from "motion/react";

const group = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const pill = {
  hidden: { opacity: 0, scale: 0.7, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 20 } },
};

/** One skill category: its pills pop in one by one, then bounce on hover. */
export default function SkillGroup({ category, items }: { category: string; items: string[] }) {
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
            key={item}
            variants={pill}
            whileHover={{ y: -4, scale: 1.08 }}
            className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-secondary transition-colors duration-200 hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-foreground"
          >
            {item}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
