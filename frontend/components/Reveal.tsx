"use client";

import { useRef } from "react";
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
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, x, y, scale: 0.97, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ delay: delay / 1000, duration: 0.8 }}
      // Leaving filter: blur(0px) behind keeps every revealed block on its own expensive paint layer, which makes theme changes slow.
      onAnimationComplete={(definition) => {
        if (typeof definition === "object" && definition !== null && "opacity" in definition) {
          ref.current?.style.setProperty("filter", "none");
        }
      }}
      ref={ref}
      className={className}
    >
      {children}
    </motion.div>
  );
}
