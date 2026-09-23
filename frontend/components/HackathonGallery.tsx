import Image from "next/image";
import Reveal from "@/components/Reveal";
import { hackathonPhotos } from "@/data/hackathons";

export default function HackathonGallery() {
  return (
    <section id="hackathons" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Hackathons</h2>
          <p className="mt-3 text-2xl sm:text-3xl font-semibold text-white">Building under pressure</p>
          <p className="mt-3 max-w-xl text-slate-300">
            [A sentence or two about the hackathons you&apos;ve joined {"—"} how many, what kind, and
            what you enjoy about that format.]
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hackathonPhotos.map((photo, i) => (
            <Reveal key={photo.src} delay={i * 80}>
              <figure className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10">
                <Image
                  src={photo.src}
                  alt={photo.caption}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-xs text-white">
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
