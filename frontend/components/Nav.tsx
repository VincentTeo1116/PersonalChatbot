"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/profile";

const LINKS = [
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#hackathons", label: "Hackathons" },
  { href: "#contact", label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        scrolled ? "bg-slate-950/80 backdrop-blur border-b border-white/10" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="#top" className="font-semibold text-white tracking-tight">
          {profile.name}
        </a>

        <ul className="hidden md:flex items-center gap-8 text-sm text-slate-300">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="hover:text-white transition-colors">
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
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs text-slate-300 hover:border-white/30 hover:text-white transition-colors"
          >
            Search
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px]">{"⌘K"}</kbd>
          </button>
          <a
            href="#contact"
            className="inline-flex items-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            Get in touch
          </a>
        </div>

        <button
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-white p-2"
        >
          <div className="w-6 h-0.5 bg-white mb-1.5" />
          <div className="w-6 h-0.5 bg-white mb-1.5" />
          <div className="w-6 h-0.5 bg-white" />
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-slate-950/95 backdrop-blur border-t border-white/10 px-6 py-4">
          <ul className="flex flex-col gap-4 text-slate-200">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block py-1">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
