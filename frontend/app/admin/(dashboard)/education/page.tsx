import DeleteButton from "@/components/admin/DeleteButton";
import Link from "next/link";
import { getEducation } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import { deleteEducation, moveEducation } from "./actions";
import { AdminForm } from "@/components/admin/AdminFeedback";

export default async function EducationListPage() {
  const education = await getEducation();

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Education"
        action={
          <Link href="/admin/education/new" className="admin-btn admin-btn-primary">
            + Add entry
          </Link>
        }
      />

      {education.length === 0 ? (
        <p className="admin-card p-6 text-sm text-text-secondary">No education entries yet -- add your first one above.</p>
      ) : (
        <ul className="space-y-3">
          {education.map((ed, i) => (
            <li key={ed.id} className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300">{ed.period}</p>
                <p className="font-semibold text-foreground">{ed.degree}</p>
                <p className="text-sm text-text-muted">{ed.institution}</p>
                <p className="mt-1 text-xs text-text-subtle">{ed.images.length} image(s)</p>
              </div>
              <div className="flex flex-wrap shrink-0 items-center gap-2">
                <form action={moveEducation}>
                  <input type="hidden" name="id" value={ed.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↑</button>
                </form>
                <form action={moveEducation}>
                  <input type="hidden" name="id" value={ed.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === education.length - 1} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↓</button>
                </form>
                <Link href={`/admin/education/${ed.id}`} className="admin-btn admin-btn-ghost px-3 py-1.5 text-xs">Edit</Link>
                <AdminForm action={deleteEducation} message="Entry deleted">
                  <input type="hidden" name="id" value={ed.id} />
                  <DeleteButton what="this entry" className="admin-btn admin-btn-danger px-3 py-1.5 text-xs" />
                </AdminForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
