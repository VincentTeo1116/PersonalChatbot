"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * A card that tilts toward the cursor in 3D, lifts on hover, and carries a soft light that
 * follows the pointer. Pass `group` in className if children use `group-hover:` styles.
 */
export default function TiltCard({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-6, 6]), { stiffness: 200, damping: 20 });

  const lightX = useTransform(px, (v) => `${v * 100}%`);
  const lightY = useTransform(py, (v) => `${v * 100}%`);
  const light = useMotionTemplate`radial-gradient(340px circle at ${lightX} ${lightY}, rgba(129, 140, 248, 0.2), transparent 70%)`;

  function handleMove(e: React.MouseEvent<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  }

  function handleLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.article
      ref={ref}
      id={id}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={`relative ${className}`}
    >
      <motion.div
        aria-hidden
        style={{ background: light }}
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {children}
    </motion.article>
  );
}
