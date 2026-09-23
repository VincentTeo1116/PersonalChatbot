import Image from "next/image";
import Reveal from "@/components/Reveal";
import { projects } from "@/data/projects";

export default function Projects() {
  return (
    <section id="projects" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Projects</h2>
          <p className="mt-3 text-2xl sm:text-3xl font-semibold text-white">Things I&apos;ve built</p>
        </Reveal>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}>
              <article className="group h-full rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-indigo-400/40 transition-colors">
                <div className="relative aspect-[8/5] overflow-hidden">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {p.featured && (
                    <span className="absolute top-3 left-3 rounded-full bg-indigo-500/90 px-2.5 py-1 text-xs font-medium text-white">
                      Featured
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-semibold text-white text-lg">{p.title}</h3>
                  <p className="mt-2 text-sm text-slate-300 leading-relaxed">{p.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-4">
                    {p.links.map((l) => (
                      <a
                        key={l.label}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
                      >
                        {l.label} &rarr;
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
