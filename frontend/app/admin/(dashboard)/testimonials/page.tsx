import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
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
      <PageHeader
        eyebrow="Content"
        title="Testimonials"
        action={
          <Link href="/admin/testimonials/new" className="admin-btn admin-btn-primary">
            + Add testimonial
          </Link>
        }
      />

      {testimonials.length === 0 ? (
        <p className="admin-card p-6 text-sm text-text-secondary">No testimonials yet.</p>
      ) : (
        <ul className="space-y-3">
          {testimonials.map((t, i) => (
            <li key={t.id} className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{t.author_name}</p>
                  <span
                    className={`admin-badge ${
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
                  <button type="submit" disabled={i === 0} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↑</button>
                </form>
                <form action={moveTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === testimonials.length - 1} className="admin-btn admin-btn-ghost px-2.5 py-1.5 text-xs disabled:opacity-30">↓</button>
                </form>
                {t.status === "pending" && (
                  <form action={approveTestimonial}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="admin-btn border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400">
                      Approve
                    </button>
                  </form>
                )}
                <Link href={`/admin/testimonials/${t.id}`} className="admin-btn admin-btn-ghost px-3 py-1.5 text-xs">Edit</Link>
                <form action={deleteTestimonial}>
                  <input type="hidden" name="id" value={t.id} />
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
