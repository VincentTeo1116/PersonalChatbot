"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import type { Profile } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import MagneticButton from "@/components/MagneticButton";
import ShortcutKey from "@/components/ShortcutKey";

// In page order. "Contact" is left out of the desktop row because the "Get in touch" button beside it goes to the same place.
const LINKS = [
  { href: "#about", label: "About" },
  { href: "#projects", label: "Projects" },
  { href: "#model-demo", label: "Demos" },
  { href: "#writing", label: "Writing" },
  { href: "#experience", label: "Experience" },
  { href: "#research", label: "Research" },
  { href: "#github", label: "GitHub" },
  { href: "#contact", label: "Contact", mobileOnly: true },
];
const DESKTOP_LINKS = LINKS.filter((link) => !link.mobileOnly);

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export default function Nav({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [activeHref, setActiveHref] = useState<string | null>(null);

  // Highlights the link for the section currently crossing the middle of the screen, so visitors always know where they are on a long page.
  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.href.slice(1))).filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveHref(`#${entry.target.id}`);
          else setActiveHref((current) => (current === `#${entry.target.id}` ? null : current));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // An open phone menu closes on Escape, and when the window grows into the desktop layout where the menu no longer exists.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{ "--enter-delay": "0.1s" } as CSSProperties}
      className={`enter-drop fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        open ? "bg-background border-b border-border" : scrolled ? "bg-background/80 backdrop-blur border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-border">
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400"
          style={{ scaleX: progress }}
        />
      </div>

      {/* Three columns: the side columns share the leftover width equally, so the links sit in the exact centre whatever the name or buttons measure. */}
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
        <a href="#top" className="justify-self-start font-semibold text-foreground tracking-tight transition-transform hover:scale-105">
          {profile.name}
        </a>

        <ul
          className="hidden lg:flex items-center gap-0.5 rounded-full border border-border bg-surface/70 p-1 text-sm text-text-secondary shadow-sm shadow-indigo-950/5 backdrop-blur"
          onMouseLeave={() => setHoveredHref(null)}
        >
          {DESKTOP_LINKS.map((l) => (
            <li key={l.href} className="relative">
              {(hoveredHref ?? activeHref) === l.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-indigo-500/10 ring-1 ring-inset ring-indigo-400/30"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <a
                href={l.href}
                onMouseEnter={() => setHoveredHref(l.href)}
                aria-current={activeHref === l.href ? "location" : undefined}
                className={`relative z-10 block whitespace-nowrap rounded-full px-3 py-1.5 transition-colors hover:text-foreground ${activeHref === l.href ? "font-medium text-foreground" : ""}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center justify-self-end gap-2">
          <button
            type="button"
            aria-label="Open command palette"
            onClick={() => window.dispatchEvent(new CustomEvent("portfolio:open-palette"))}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-text-secondary transition-all duration-200 hover:border-indigo-400/40 hover:text-foreground hover:scale-105"
          >
            <span className="hidden xl:inline">Search</span>
            <kbd className="whitespace-nowrap rounded border border-border bg-surface px-1.5 py-0.5 text-[10px]"><ShortcutKey /></kbd>
          </button>
          {profile.contact.linkedin && (
            <a
              href={profile.contact.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn profile"
              className="hidden xl:inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition-all duration-200 hover:border-indigo-400/40 hover:text-foreground hover:scale-105"
            >
              <LinkedInIcon />
            </a>
          )}
          <ThemeToggle />
          {profile.contact.resumeUrl && (
            <button
              type="button"
              data-analytics-event="resume_open"
              onClick={() => window.dispatchEvent(new CustomEvent("portfolio:open-resume"))}
              className="hidden xl:inline-flex items-center whitespace-nowrap rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:border-indigo-400/40 hover:bg-foreground/5 active:scale-95"
            >
              Resume
            </button>
          )}
          <MagneticButton>
            <a
              href="#contact"
              className="inline-flex items-center whitespace-nowrap rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-indigo-400 active:scale-95"
            >
              Get in touch
            </a>
          </MagneticButton>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
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

      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain bg-background"
        aria-hidden={!open}
      >
        <ul className="flex flex-col gap-1 px-6 py-3 text-text-secondary">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} className="block min-h-11 rounded-lg px-3 py-3 transition hover:bg-surface-hover hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
          {profile.contact.resumeUrl && (
            <li>
              <button
                type="button"
                data-analytics-event="resume_open"
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent("portfolio:open-resume"));
                }}
                tabIndex={open ? 0 : -1}
                className="block min-h-11 w-full rounded-lg px-3 py-3 text-left transition hover:bg-surface-hover hover:text-foreground"
              >
                Resume
              </button>
            </li>
          )}
          {profile.contact.linkedin && (
            <li>
              <a href={profile.contact.linkedin} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} className="block min-h-11 rounded-lg px-3 py-3 transition hover:bg-surface-hover hover:text-foreground">
                LinkedIn
              </a>
            </li>
          )}
        </ul>
      </motion.div>
    </header>
  );
}
