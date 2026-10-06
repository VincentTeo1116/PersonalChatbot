"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import type { Profile } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import MagneticButton from "@/components/MagneticButton";

const LINKS = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#github-exhibition", label: "GitHub Gallery" },
  { href: "#research", label: "Research" },
  { href: "#hackathons", label: "Hackathons" },
  { href: "#contact", label: "Contact" },
];

export default function Nav({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-border">
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400"
          style={{ scaleX: progress }}
        />
      </div>

      <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="font-semibold text-foreground tracking-tight transition-transform hover:scale-105">
          {profile.name}
        </a>

        <ul
          className="hidden md:flex items-center gap-1 text-sm text-text-secondary"
          onMouseLeave={() => setHoveredHref(null)}
        >
          {LINKS.map((l) => (
            <li key={l.href} className="relative">
              {hoveredHref === l.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-surface-hover"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <a
                href={l.href}
                onMouseEnter={() => setHoveredHref(l.href)}
                className="relative z-10 block px-3 py-1.5 hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            aria-label="Open command palette"
            onClick={() => window.dispatchEvent(new CustomEvent("portfolio:open-palette"))}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-text-secondary transition-all duration-200 hover:border-indigo-400/40 hover:text-foreground hover:scale-105"
          >
            Search
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px]">{"⌘K"}</kbd>
          </button>
          <ThemeToggle />
          <MagneticButton>
            <a
              href="#contact"
              className="inline-flex items-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-400 active:scale-95"
            >
              Get in touch
            </a>
          </MagneticButton>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="text-foreground p-2"
          >
            <div
              className={`w-6 h-0.5 bg-foreground mb-1.5 transition-transform duration-300 ${open ? "translate-y-2 rotate-45" : ""}`}
            />
            <div className={`w-6 h-0.5 bg-foreground mb-1.5 transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
            <div
              className={`w-6 h-0.5 bg-foreground transition-transform duration-300 ${open ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </div>
      </nav>

      <div
        className={`md:hidden overflow-hidden bg-background/95 backdrop-blur border-b border-border transition-all duration-300 ease-out ${
          open ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="flex flex-col gap-4 px-6 py-4 text-text-secondary">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="block py-1">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </motion.header>
  );
}
