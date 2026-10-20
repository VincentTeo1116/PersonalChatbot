import type { Publication } from "@/lib/types";
import { AdminForm, type ActionResult } from "@/components/admin/AdminFeedback";

const inputClass = "admin-input";
const labelClass = "admin-label";

export default function ResearchForm({
  research,
  action,
  submitLabel,
  redirectTo,
}: {
  research?: Publication;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  /** Where to go after a successful save (edit forms); create actions return their own redirectTo. */
  redirectTo?: string;
}) {
  return (
    <AdminForm
      action={action}
      message={research ? "Changes saved" : "Created"}
      detail={research ? undefined : "Opening the editor so you can add images…"}
      redirectTo={redirectTo}
      className="admin-card max-w-2xl space-y-4 p-6">
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

      <button type="submit" className="admin-btn admin-btn-primary">
        {submitLabel}
      </button>
    </AdminForm>
  );
}
