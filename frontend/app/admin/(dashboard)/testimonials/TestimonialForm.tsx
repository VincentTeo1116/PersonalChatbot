import type { Testimonial } from "@/lib/types";
import { AdminForm, type ActionResult } from "@/components/admin/AdminFeedback";

const inputClass = "admin-input";
const labelClass = "admin-label";

export default function TestimonialForm({
  testimonial,
  action,
  submitLabel,
  redirectTo,
}: {
  testimonial?: Testimonial;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  /** Where to go after a successful save (edit forms); create actions return their own redirectTo. */
  redirectTo?: string;
}) {
  return (
    <AdminForm
      action={action}
      message={testimonial ? "Changes saved" : "Created"}
      detail={testimonial ? undefined : "Opening the editor so you can add images…"}
      redirectTo={redirectTo}
      className="admin-card max-w-2xl space-y-4 p-6">
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
    </AdminForm>
  );
}
