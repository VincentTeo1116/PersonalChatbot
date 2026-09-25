import type { Publication } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400";
const labelClass = "text-sm text-text-secondary";

export default function ResearchForm({
  research,
  action,
  submitLabel,
}: {
  research?: Publication;
  action: (formData: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="max-w-2xl space-y-4">
      {research && <input type="hidden" name="id" value={research.id} />}

      <div>
        <label className={labelClass} htmlFor="slug">Slug</label>
        <input id="slug" name="slug" defaultValue={research?.slug} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={research?.title} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="venue">Venue</label>
        <input id="venue" name="venue" defaultValue={research?.venue} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} htmlFor="authors">Authors (comma-separated)</label>
        <input id="authors" name="authors" defaultValue={research?.authors.join(", ")} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="supervisor">Supervisor</label>
        <input id="supervisor" name="supervisor" defaultValue={research?.supervisor} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="doi">DOI</label>
        <input id="doi" name="doi" defaultValue={research?.doi} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="doiUrl">DOI URL</label>
        <input id="doiUrl" name="doiUrl" defaultValue={research?.doiUrl} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor="description">Description</label>
        <textarea id="description" name="description" defaultValue={research?.description} rows={4} className={inputClass} required />
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
