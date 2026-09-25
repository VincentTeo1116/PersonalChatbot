import Image from "next/image";
import Reveal from "@/components/Reveal";
import type { HackathonPhoto } from "@/lib/types";

export default function HackathonGallery({ hackathonPhotos }: { hackathonPhotos: HackathonPhoto[] }) {
  return (
    <section id="hackathons" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Hackathons</h2>
          <p className="mt-3 text-2xl sm:text-3xl font-semibold text-foreground">Building under pressure</p>
          <p className="mt-3 max-w-xl text-text-secondary">
            Four hackathons in under a year — GTD x APU (3rd place), KitaHack, UM Hackathon, and AWS
            CendekiAwan — each one a fresh problem, a new team, and roughly 24-48 hours to ship
            something real. I keep coming back for the pace and the forced simplicity.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hackathonPhotos.map((photo, i) => (
            <Reveal key={photo.id} delay={i * 80}>
              <figure className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-border transition-colors duration-300 hover:border-indigo-400/40">
                <Image
                  src={photo.src}
                  alt={photo.caption}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <figcaption className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-black/80 to-transparent p-3 text-xs text-white opacity-90 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {photo.caption}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
