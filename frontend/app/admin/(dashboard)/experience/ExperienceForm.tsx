import type { WorkExperience } from "@/lib/types";
import { AdminForm, type ActionResult } from "@/components/admin/AdminFeedback";

const inputClass = "admin-input";
const labelClass = "admin-label";

export default function ExperienceForm({
  experience,
  action,
  submitLabel,
  redirectTo,
}: {
  experience?: WorkExperience;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  /** Where to go after a successful save (edit forms); create actions return their own redirectTo. */
  redirectTo?: string;
}) {
  return (
    <AdminForm
      action={action}
      message={experience ? "Changes saved" : "Created"}
      detail={experience ? undefined : "Opening the editor so you can add images…"}
      redirectTo={redirectTo}
      className="admin-card max-w-2xl space-y-4 p-6">
      {experience && <input type="hidden" name="id" value={experience.id} />}

      <div>
        <label className={labelClass} htmlFor="role">Role / title</label>
        <input id="role" name="role" defaultValue={experience?.role} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="company">Company</label>
        <input id="company" name="company" defaultValue={experience?.company} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="period">Period</label>
        <input
          id="period"
          name="period"
          defaultValue={experience?.period}
          placeholder="e.g. Jun 2025 – Aug 2025"
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="detail">Detail</label>
        <textarea id="detail" name="detail" defaultValue={experience?.detail} rows={4} className={inputClass} required />
      </div>

      <button type="submit" className="admin-btn admin-btn-primary">
        {submitLabel}
      </button>
    </AdminForm>
  );
}
