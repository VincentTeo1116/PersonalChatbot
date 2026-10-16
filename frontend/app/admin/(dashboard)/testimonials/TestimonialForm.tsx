import type { Testimonial } from "@/lib/types";

const inputClass = "admin-input";
const labelClass = "admin-label";

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
    <form action={action} className="admin-card max-w-2xl space-y-4 p-6">
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

      <button type="submit" className="admin-btn admin-btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
