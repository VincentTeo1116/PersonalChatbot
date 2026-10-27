import Link from "next/link";
import type { ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import AnimatedArrow from "@/components/AnimatedArrow";

export default function ContentShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-5 px-6 pt-8">
        <Link href="/" className="text-sm font-medium text-text-secondary hover:text-foreground"><AnimatedArrow direction="left" /> Portfolio</Link>
        <nav aria-label="Explore the portfolio" className="flex w-full flex-wrap items-center justify-between gap-2 text-sm text-text-secondary sm:w-auto sm:justify-start sm:gap-4">
          <Link href="/ai-lab" className="hover:text-foreground">AI lab</Link>
          <Link href="/research" className="hover:text-foreground">Research</Link>
          <Link href="/writing" className="hover:text-foreground">Writing</Link>
          <Link href="/services" className="hover:text-foreground">Services</Link>
          <ThemeToggle />
        </nav>
      </header>
      <article className="mx-auto max-w-4xl px-6 pb-24 pt-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">{title}</h1>
        {intro && <p className="mt-6 max-w-3xl text-lg leading-relaxed text-text-secondary">{intro}</p>}
        {children}
      </article>
    </main>
  );
}
