import Link from "next/link";
import { getTestimonials } from "@/lib/data";
import { deleteTestimonial, moveTestimonial } from "./actions";

export default async function TestimonialsListPage() {
  const testimonials = await getTestimonials();

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
          No testimonials yet. If supabase/005_testimonials.sql hasn&apos;t been run in the Supabase SQL editor,
          run it first.
        </p>
      )}

      <ul className="space-y-3">
        {testimonials.map((t, i) => (
          <li key={t.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{t.authorName}</p>
                <p className="text-sm text-text-muted">{t.authorRole}</p>
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
