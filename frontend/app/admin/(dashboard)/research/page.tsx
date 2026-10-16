import Link from "next/link";
import { getResearch } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import { deleteResearch, moveResearch } from "./actions";

export default async function ResearchListPage() {
  const research = await getResearch();

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Research"
        action={
          <Link href="/admin/research/new" className="admin-btn admin-btn-primary">
            + Add paper
          </Link>
        }
      />

      {research.length === 0 ? (
        <p className="admin-card p-6 text-sm text-text-secondary">No research papers yet -- add your first one above.</p>
      ) : (
        <ul className="space-y-3">
          {research.map((r, i) => (
            <li key={r.id} className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{r.title}</p>
                <p className="text-sm text-text-muted">{r.venue}</p>
              </div>
              <div className="flex flex-wrap shrink-0 items-center gap-2">
                <form action={moveResearch}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↑</button>
                </form>
                <form action={moveResearch}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === research.length - 1} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↓</button>
                </form>
                <Link href={`/admin/research/${r.id}`} className="admin-btn admin-btn-ghost px-3 py-1.5 text-xs">Edit</Link>
                <form action={deleteResearch}>
                  <input type="hidden" name="id" value={r.id} />
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
