import Link from "next/link";
import { getResearch } from "@/lib/data";
import { deleteResearch, moveResearch } from "./actions";

export default async function ResearchListPage() {
  const research = await getResearch();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Research</h1>
        <Link
          href="/admin/research/new"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          + Add paper
        </Link>
      </div>

      <ul className="space-y-3">
        {research.map((r, i) => (
          <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{r.title}</p>
                <p className="text-sm text-text-muted">{r.venue}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <form action={moveResearch}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-30">
                    ↑
                  </button>
                </form>
                <form action={moveResearch}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === research.length - 1} className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-30">
                    ↓
                  </button>
                </form>
                <Link href={`/admin/research/${r.id}`} className="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:text-foreground">
                  Edit
                </Link>
                <form action={deleteResearch}>
                  <input type="hidden" name="id" value={r.id} />
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
