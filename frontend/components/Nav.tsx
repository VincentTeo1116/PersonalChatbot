"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/profile";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#research", label: "Research" },
  { href: "#hackathons", label: "Hackathons" },
  { href: "#contact", label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-border">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="font-semibold text-foreground tracking-tight transition-transform hover:scale-105">
          {profile.name}
        </a>

        <ul className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="group relative py-1 hover:text-foreground transition-colors">
                {l.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-indigo-400 to-fuchsia-400 transition-transform duration-300 group-hover:scale-x-100" />
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
          <a
            href="#contact"
            className="inline-flex items-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-400 hover:scale-105 active:scale-95"
          >
            Get in touch
          </a>
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
          open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
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
    </header>
  );
}
