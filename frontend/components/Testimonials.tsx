import Image from "next/image";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import TiltCard from "@/components/TiltCard";
import type { Testimonial } from "@/lib/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export default function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Testimonials" title="What people say" />

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={i * 80} direction={i % 2 === 0 ? "left" : "right"}>
              <TiltCard className="h-full rounded-2xl border border-border bg-surface p-6">
                <p className="text-sm leading-relaxed text-text-secondary">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface-hover">
                    {t.avatarUrl ? (
                      <Image src={t.avatarUrl} alt={t.authorName} fill className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-text-muted">
                        {initials(t.authorName)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{t.authorName}</p>
                    {t.authorRole && <p className="truncate text-xs text-text-muted">{t.authorRole}</p>}
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
