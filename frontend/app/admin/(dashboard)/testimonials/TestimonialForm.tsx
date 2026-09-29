import type { Testimonial } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";

export default function TestimonialForm({
  testimonial,
  action,
  submitLabel,
}: {
  testimonial?: Testimonial;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-4">
      {testimonial && <input type="hidden" name="id" value={testimonial.id} />}

      <div>
        <label className={labelClass} htmlFor="authorName">Name</label>
        <input id="authorName" name="authorName" defaultValue={testimonial?.authorName} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="authorRole">Role (e.g. &quot;Supervisor, FootfallCam&quot;)</label>
        <input id="authorRole" name="authorRole" defaultValue={testimonial?.authorRole} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="quote">Quote</label>
        <textarea id="quote" name="quote" defaultValue={testimonial?.quote} rows={4} className={inputClass} required />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}
