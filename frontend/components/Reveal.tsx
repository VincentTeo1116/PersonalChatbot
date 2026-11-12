"use client";

import { motion } from "motion/react";

const OFFSETS = {
  up: { x: 0, y: 44 },
  down: { x: 0, y: -44 },
  left: { x: -56, y: 0 },
  right: { x: 56, y: 0 },
  none: { x: 0, y: 0 },
};

export default function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: keyof typeof OFFSETS;
}) {
  const { x, y } = OFFSETS[direction];

  return (
    <motion.div
      // Fade and slide only: an animated blur filter is the most expensive effect to paint and kept finished blocks on their own layers.
      initial={{ opacity: 0, x, y, scale: 0.97 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ delay: delay / 1000, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
