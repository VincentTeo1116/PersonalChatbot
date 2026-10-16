import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-float-slow absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-500 opacity-[var(--blob-opacity)] blur-[120px]" />
        <div className="animate-float absolute bottom-0 right-1/4 h-[260px] w-[260px] rounded-full bg-fuchsia-500 opacity-[var(--blob-opacity)] blur-[100px]" />
      </div>

      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <p className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-7xl font-bold text-transparent">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        The link might be old, mistyped, or the page may have moved. Let&apos;s get you back on track.
      </p>

      <Link
        href="/"
        className="mt-8 rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
      >
        Back to homepage
      </Link>
    </main>
  );
}
