import type { WorkExperience } from "@/lib/types";

const inputClass = "admin-input";
const labelClass = "admin-label";

export default function ExperienceForm({
  experience,
  action,
  submitLabel,
}: {
  experience?: WorkExperience;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="admin-card max-w-2xl space-y-4 p-6">
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
    </form>
  );
}
