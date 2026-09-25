import type { WorkExperience } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";

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
    <form action={action} className="max-w-2xl space-y-4">
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

      <button
        type="submit"
        className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
      >
        {submitLabel}
      </button>
    </form>
  );
}
