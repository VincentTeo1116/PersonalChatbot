import type { EducationEntry } from "@/lib/types";
import { AdminForm, type ActionResult } from "@/components/admin/AdminFeedback";

const inputClass = "admin-input";
const labelClass = "admin-label";

export default function EducationForm({
  education,
  action,
  submitLabel,
  redirectTo,
}: {
  education?: EducationEntry;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  /** Where to go after a successful save (edit forms); create actions return their own redirectTo. */
  redirectTo?: string;
}) {
  return (
    <AdminForm
      action={action}
      message={education ? "Changes saved" : "Created"}
      detail={education ? undefined : "Opening the editor so you can add images…"}
      redirectTo={redirectTo}
      className="admin-card max-w-2xl space-y-4 p-6">
      {education && <input type="hidden" name="id" value={education.id} />}

      <div>
        <label className={labelClass} htmlFor="degree">Degree</label>
        <input id="degree" name="degree" defaultValue={education?.degree} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="institution">Institution</label>
        <input id="institution" name="institution" defaultValue={education?.institution} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="period">Period</label>
        <input
          id="period"
          name="period"
          defaultValue={education?.period}
          placeholder="e.g. Nov 2025 – Present"
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="detail">Detail</label>
        <textarea id="detail" name="detail" defaultValue={education?.detail} rows={3} className={inputClass} required />
      </div>

      <button type="submit" className="admin-btn admin-btn-primary">
        {submitLabel}
      </button>
    </AdminForm>
  );
}
