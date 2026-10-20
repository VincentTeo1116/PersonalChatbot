import DeleteButton from "@/components/admin/DeleteButton";
import Link from "next/link";
import { getProjects } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import { deleteProject, moveProject } from "./actions";
import { AdminForm } from "@/components/admin/AdminFeedback";

export default async function ProjectsListPage() {
  const projects = await getProjects();

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Projects"
        description="Shown on the homepage and as individual case-study pages."
        action={
          <Link href="/admin/projects/new" className="admin-btn admin-btn-primary">
            + Add project
          </Link>
        }
      />

      {projects.length === 0 ? (
        <p className="admin-card p-6 text-sm text-text-secondary">No projects yet -- add your first one above.</p>
      ) : (
        <ul className="space-y-3">
          {projects.map((p, i) => (
            <li key={p.id} className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{p.title}</p>
                <p className="text-sm text-text-muted">{p.slug}</p>
                <p className="mt-1 text-xs text-text-subtle">{p.tags.join(", ")}</p>
              </div>
              <div className="flex flex-wrap shrink-0 items-center gap-2">
                <form action={moveProject}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↑</button>
                </form>
                <form action={moveProject}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === projects.length - 1} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↓</button>
                </form>
                <Link href={`/admin/projects/${p.id}`} className="admin-btn admin-btn-ghost px-3 py-1.5 text-xs">Edit</Link>
                <AdminForm action={deleteProject} message="Project deleted">
                  <input type="hidden" name="id" value={p.id} />
                  <DeleteButton what="this project" className="admin-btn admin-btn-danger px-3 py-1.5 text-xs" />
                </AdminForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
