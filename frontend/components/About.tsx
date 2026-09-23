import Reveal from "@/components/Reveal";
import { profile } from "@/data/profile";

export default function About() {
  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">About</h2>
          <p className="mt-3 max-w-2xl text-2xl sm:text-3xl font-semibold text-white leading-snug">
            {profile.about}
          </p>
        </Reveal>

        <div className="mt-16 grid gap-16 lg:grid-cols-2">
          {/* Education timeline */}
          <Reveal delay={100}>
            <h3 className="text-lg font-semibold text-white mb-6">Education</h3>
            <ol className="relative border-l border-white/10 pl-6 space-y-8">
              {profile.education.map((ed) => (
                <li key={ed.degree} className="relative">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-indigo-400 ring-4 ring-indigo-400/20" />
                  <p className="text-xs font-medium text-indigo-300">{ed.period}</p>
                  <h4 className="mt-1 font-semibold text-white">{ed.degree}</h4>
                  <p className="text-sm text-slate-400">{ed.institution}</p>
                  <p className="mt-1 text-sm text-slate-300">{ed.detail}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          {/* Skills */}
          <Reveal delay={200}>
            <h3 className="text-lg font-semibold text-white mb-6">Skills</h3>
            <div className="space-y-6">
              {Object.entries(profile.skills).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
