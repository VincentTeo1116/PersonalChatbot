/** Endless, slowly scrolling strip of skills (pure CSS, pauses on hover). */
export default function TechMarquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const row = [...items, ...items];

  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-y border-border py-5 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {row.map((item, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-10 pr-10 text-sm font-medium whitespace-nowrap text-text-muted"
          >
            {item}
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400" />
          </span>
        ))}
      </div>
    </div>
  );
}
