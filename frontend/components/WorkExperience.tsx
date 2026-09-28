import Image from "next/image";
import SectionHeading from "@/components/SectionHeading";
import { Timeline, TimelineItem } from "@/components/Timeline";
import type { WorkExperience as WorkExperienceEntry } from "@/lib/types";

function DetailText({ detail }: { detail: string }) {
  const lines = detail.split("\n").map((line) => line.trim()).filter(Boolean);

  if (lines.length <= 1) {
    return <p className="mt-2 text-sm text-text-secondary">{detail}</p>;
  }

  return (
    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-text-secondary">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

export default function WorkExperience({ experience }: { experience: WorkExperienceEntry[] }) {
  if (experience.length === 0) return null;

  return (
    <section id="experience" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Experience" title="Working experience" />

        <div className="mt-12 max-w-2xl">
          <Timeline className="space-y-10">
            {experience.map((exp, index) => (
              <TimelineItem key={exp.id} index={index}>
                <div className="flex items-start gap-3">
                  {exp.logoUrl && (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
                      <Image src={exp.logoUrl} alt={`${exp.company} logo`} fill className="object-cover" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-indigo-500 dark:text-indigo-300">{exp.period}</p>
                    <h3 className="mt-1 font-semibold text-foreground transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-300">
                      {exp.role}
                    </h3>
                    <p className="text-sm text-text-muted">{exp.company}</p>
                  </div>
                </div>

                <DetailText detail={exp.detail} />

                {exp.images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {exp.images.map((img, i) => (
                      <div
                        key={img.src + i}
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
        </div>
      </div>
    </section>
  );
}
