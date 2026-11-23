import DeleteButton from "@/components/admin/DeleteButton";
import Link from "next/link";
import { getAllProjects } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import { deleteProject, moveProject, setProjectStatus } from "./actions";
import { AdminForm } from "@/components/admin/AdminFeedback";

export default async function ProjectsListPage() {
  // Every project, hidden ones included: the order below is the one that is kept in the database, whatever is hidden.
  const projects = await getAllProjects();
  const visible = projects.filter((p) => p.status !== "hidden").length;

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Projects"
        description={`Shown on the homepage and as individual case-study pages. ${visible} of ${projects.length} are published; a hidden project keeps its place in this order and is skipped on the site.`}
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
            <li key={p.id} className={`admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${p.status === "hidden" ? "opacity-70" : ""}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{p.title}</p>
                  <span
                    className={`admin-badge ${
                      p.status === "hidden"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {p.status === "hidden" ? "Hidden" : "Published"}
                  </span>
                </div>
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
                <AdminForm
                  action={setProjectStatus}
                  message={p.status === "hidden" ? "Project published" : "Project hidden"}
                  detail={p.status === "hidden" ? "It is back on the site in its old position." : "It is off the site and the chatbot. Its position is kept."}
                >
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="status" value={p.status === "hidden" ? "published" : "hidden"} />
                  <button
                    type="submit"
                    className={
                      p.status === "hidden"
                        ? "admin-btn border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                        : "admin-btn admin-btn-ghost px-3 py-1.5 text-xs"
                    }
                  >
                    {p.status === "hidden" ? "Publish" : "Hide"}
                  </button>
                </AdminForm>
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
