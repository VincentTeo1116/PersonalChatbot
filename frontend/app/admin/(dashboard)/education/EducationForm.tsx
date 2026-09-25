import type { EducationEntry } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";

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
    <form action={action} className="max-w-2xl space-y-4">
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

      <button
        type="submit"
        className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}
