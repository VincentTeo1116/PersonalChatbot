import Link from "next/link";
import { getWorkExperience } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import { deleteExperience, moveExperience } from "./actions";

export default async function ExperienceListPage() {
  const experience = await getWorkExperience();

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Working Experience"
        action={
          <Link href="/admin/experience/new" className="admin-btn admin-btn-primary">
            + Add entry
          </Link>
        }
      />

      {experience.length === 0 ? (
        <p className="admin-card p-6 text-sm text-text-secondary">No experience entries yet -- add your first one above.</p>
      ) : (
        <ul className="space-y-3">
          {experience.map((exp, i) => (
            <li key={exp.id} className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-indigo-500 dark:text-indigo-300">{exp.period}</p>
                <p className="font-semibold text-foreground">{exp.role}</p>
                <p className="text-sm text-text-muted">{exp.company}</p>
                <p className="mt-1 text-xs text-text-subtle">
                  {exp.logoUrl ? "Logo set" : "No logo"} · {exp.images.length}/2 photos
                </p>
              </div>
              <div className="flex flex-wrap shrink-0 items-center gap-2">
                <form action={moveExperience}>
                  <input type="hidden" name="id" value={exp.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↑</button>
                </form>
                <form action={moveExperience}>
                  <input type="hidden" name="id" value={exp.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === experience.length - 1} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↓</button>
                </form>
                <Link href={`/admin/experience/${exp.id}`} className="admin-btn admin-btn-ghost px-3 py-1.5 text-xs">Edit</Link>
                <form action={deleteExperience}>
                  <input type="hidden" name="id" value={exp.id} />
                  <button type="submit" className="admin-btn admin-btn-danger px-3 py-1.5 text-xs">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
