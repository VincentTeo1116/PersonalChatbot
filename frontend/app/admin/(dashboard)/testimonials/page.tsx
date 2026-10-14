import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { approveTestimonial, deleteTestimonial, moveTestimonial } from "./actions";

// Queried directly with the authenticated client (not getTestimonials() from lib/data.ts,
// which is public-only and RLS-filtered to status="approved") so pending submissions are
// visible here for review.
export default async function TestimonialsListPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("testimonials").select("*").order("sort_order");
  const testimonials = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Testimonials</h1>
        <Link
          href="/admin/testimonials/new"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          + Add testimonial
        </Link>
      </div>

      {testimonials.length === 0 && (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-subtle">
          No testimonials yet.
        </p>
      )}

      <ul className="space-y-3">
        {testimonials.map((t, i) => (
          <li key={t.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{t.author_name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      t.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {t.status === "approved" ? "Approved" : "Pending"}
                  </span>
                </div>
                <p className="text-sm text-text-muted">{t.author_role}</p>
                <p className="mt-1 line-clamp-2 text-xs text-text-subtle">{t.quote}</p>
              </div>
              <div className="flex flex-wrap shrink-0 items-center gap-2">
                <form action={moveTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-30">
                    ↑
                  </button>
                </form>
                <form action={moveTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === testimonials.length - 1} className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-30">
                    ↓
                  </button>
                </form>
                {t.status === "pending" && (
                  <form action={approveTestimonial}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="rounded-lg border border-emerald-500/40 px-3 py-1 text-xs text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                      Approve
                    </button>
                  </form>
                )}
                <Link href={`/admin/testimonials/${t.id}`} className="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:text-foreground">
                  Edit
                </Link>
                <form action={deleteTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
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
