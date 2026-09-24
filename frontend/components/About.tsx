import Reveal from "@/components/Reveal";
import StatCounter from "@/components/StatCounter";
import { profile } from "@/data/profile";

export default function About() {
  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-400">About</h2>
          <p className="mt-3 max-w-2xl text-base sm:text-lg text-text-secondary leading-relaxed">
            {profile.about}
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
            <StatCounter value={4.0} decimals={2} label="Current CGPA" />
            <StatCounter value={4} label="Hackathons" />
            <StatCounter value={1} label="Published Paper" />
          </div>
        </Reveal>

        <div className="mt-16 grid gap-16 lg:grid-cols-2">
          {/* Education timeline */}
          <Reveal delay={100}>
            <h3 className="text-lg font-semibold text-foreground mb-6">Education</h3>
            <ol className="relative border-l border-border pl-6 space-y-8">
              {profile.education.map((ed) => (
                <li key={ed.degree} className="group relative transition-transform duration-300 hover:translate-x-1">
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-indigo-400 ring-4 ring-indigo-400/20 animate-pulse-ring" />
                  <p className="text-xs font-medium text-indigo-500 dark:text-indigo-300">{ed.period}</p>
                  <h4 className="mt-1 font-semibold text-foreground transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-300">
                    {ed.degree}
                  </h4>
                  <p className="text-sm text-text-muted">{ed.institution}</p>
                  <p className="mt-1 text-sm text-text-secondary">{ed.detail}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          {/* Skills */}
          <Reveal delay={200}>
            <h3 className="text-lg font-semibold text-foreground mb-6">Skills</h3>
            <div className="space-y-6">
              {Object.entries(profile.skills).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:text-foreground"
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
