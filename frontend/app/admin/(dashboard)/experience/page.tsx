import Link from "next/link";
import { getWorkExperience } from "@/lib/data";
import { deleteExperience, moveExperience } from "./actions";

export default async function ExperienceListPage() {
  const experience = await getWorkExperience();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Working Experience</h1>
        <Link
          href="/admin/experience/new"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          + Add entry
        </Link>
      </div>

      <ul className="space-y-3">
        {experience.map((exp, i) => (
          <li key={exp.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-indigo-500 dark:text-indigo-300">{exp.period}</p>
                <p className="font-semibold text-foreground">{exp.role}</p>
                <p className="text-sm text-text-muted">{exp.company}</p>
                <p className="mt-1 text-xs text-text-subtle">
                  {exp.logoUrl ? "Logo set" : "No logo"} · {exp.images.length}/2 photos
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <form action={moveExperience}>
                  <input type="hidden" name="id" value={exp.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-30">
                    ↑
                  </button>
                </form>
                <form action={moveExperience}>
                  <input type="hidden" name="id" value={exp.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === experience.length - 1} className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-30">
                    ↓
                  </button>
                </form>
                <Link href={`/admin/experience/${exp.id}`} className="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:text-foreground">
                  Edit
                </Link>
                <form action={deleteExperience}>
                  <input type="hidden" name="id" value={exp.id} />
                  <button type="submit" className="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:text-red-500">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
