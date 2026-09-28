import Image from "next/image";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import SkillGroup from "@/components/SkillGroup";
import StatCounter from "@/components/StatCounter";
import { Timeline, TimelineItem } from "@/components/Timeline";
import type { Profile, Publication } from "@/lib/types";

export default function About({ profile, research }: { profile: Profile; research: Publication[] }) {
  return (
    <section id="about" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="About">
          <p className="mt-3 max-w-2xl text-base sm:text-lg text-text-secondary leading-relaxed">
            {profile.about}
          </p>
        </SectionHeading>

        <Reveal delay={80}>
          <div className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
            {profile.statCgpa != null && (
              <StatCounter value={profile.statCgpa} decimals={2} label="Current CGPA" />
            )}
            {profile.statHackathons != null && (
              <StatCounter value={profile.statHackathons} label="Hackathons" />
            )}
            <StatCounter value={research.length} label="Published Paper" />
          </div>
        </Reveal>

        <div className="mt-16 grid gap-16 lg:grid-cols-2">
          {/* Education timeline */}
          <Reveal delay={100} direction="left">
            <h3 className="text-lg font-semibold text-foreground mb-6">Education</h3>
            <Timeline className="space-y-8">
              {profile.education.map((ed, i) => (
                <TimelineItem key={ed.id} index={i}>
                  <p className="text-xs font-medium text-indigo-500 dark:text-indigo-300">{ed.period}</p>
                  <h4 className="mt-1 font-semibold text-foreground transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-300">
                    {ed.degree}
                  </h4>
                  <p className="text-sm text-text-muted">{ed.institution}</p>
                  <p className="mt-1 text-sm text-text-secondary">{ed.detail}</p>
                  {ed.images && ed.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ed.images.map((img) => (
                        <div
                          key={img.src + img.caption}
                          className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-surface transition-transform duration-300 hover:scale-105"
                          title={img.caption}
                        >
                          <Image src={img.src} alt={img.caption} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </TimelineItem>
              ))}
            </Timeline>
          </Reveal>

          {/* Skills */}
          <Reveal delay={200} direction="right">
            <h3 className="text-lg font-semibold text-foreground mb-6">Skills</h3>
            <div className="space-y-6">
              {profile.skills.map(({ category, items }) => (
                <SkillGroup key={category} category={category} items={items} />
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
