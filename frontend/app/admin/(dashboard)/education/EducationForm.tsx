import type { EducationEntry } from "@/lib/types";

const inputClass = "admin-input";
const labelClass = "admin-label";

export default function EducationForm({
  education,
  action,
  submitLabel,
}: {
  education?: EducationEntry;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="admin-card max-w-2xl space-y-4 p-6">
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
    </form>
  );
}
