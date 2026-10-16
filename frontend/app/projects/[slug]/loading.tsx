export default function LoadingCaseStudy() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-6 pt-8">
        <div className="h-5 w-40 animate-pulse rounded bg-surface-hover" />
      </div>

      <article className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <div className="aspect-[16/9] animate-pulse rounded-2xl border border-border bg-surface-hover" />
        <div className="mt-8 h-9 w-2/3 animate-pulse rounded bg-surface-hover" />
        <div className="mt-4 flex gap-2">
          {[16, 20, 14].map((w, i) => (
            <div key={i} className="h-6 animate-pulse rounded-full bg-surface-hover" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
        <div className="mt-6 space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-full animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-hover" />
        </div>
      </article>
    </main>
  );
}
