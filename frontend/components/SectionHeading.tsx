"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

/**
 * Eyebrow label with a gradient line that draws itself, a title that slides up out of a
 * mask, and an optional description that fades in after.
 */
export default function SectionHeading({
  eyebrow,
  title,
  children,
  align = "left",
  large = false,
}: {
  eyebrow: string;
  title?: string;
  children?: ReactNode;
  align?: "left" | "center";
  large?: boolean;
}) {
  const center = align === "center";

  return (
    <div className={center ? "text-center" : ""}>
      <div className={`flex items-center gap-3 ${center ? "justify-center" : ""}`}>
        <motion.span
          aria-hidden
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 1 }}
          transition={{ duration: 0.9 }}
          className="h-px w-10 origin-left bg-gradient-to-r from-indigo-400 to-fuchsia-400"
        />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">{eyebrow}</h2>
      </div>

      {title && (
        // The in-view trigger must sit on this unclipped wrapper: the text itself starts
        // below the mask, where the browser never counts it as visible.
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          className="mt-3 overflow-hidden pb-1 -mb-1"
        >
          <motion.p
            variants={{ hidden: { y: "110%" }, show: { y: 0, transition: { duration: 0.75, delay: 0.1 } } }}
            className={`font-semibold text-foreground ${large ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}
          >
            {title}
          </motion.p>
        </motion.div>
      )}

      {children && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: 0.25 }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
