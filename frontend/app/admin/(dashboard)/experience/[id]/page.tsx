import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import ExperienceForm from "../ExperienceForm";
import {
  deleteExperiencePhoto,
  updateExperience,
  uploadExperienceLogo,
  uploadExperiencePhoto,
} from "../actions";
import { AdminForm } from "@/components/admin/AdminFeedback";

const BUCKET = "portfolio-content";
const MAX_PHOTOS = 2;

export default async function EditExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: experience } = await supabase.from("work_experience").select("*").eq("id", id).single();
  if (!experience) notFound();

  const { data: photos } = await supabase
    .from("work_experience_images")
    .select("*")
    .eq("work_experience_id", id)
    .order("sort_order");

  const logoUrl = experience.logo_path
    ? supabase.storage.from(BUCKET).getPublicUrl(experience.logo_path).data.publicUrl
    : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="Edit work experience entry" />

      <ExperienceForm
        experience={{
          id: experience.id,
          role: experience.role,
          company: experience.company,
          period: experience.period,
          detail: experience.detail,
          logoUrl,
          images: [],
        }}
        action={updateExperience}
        redirectTo="/admin/experience"
        submitLabel="Save changes"
      />

      <section className="admin-card max-w-2xl space-y-3 p-6">
        <h2 className="text-sm font-semibold text-foreground">Company logo</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-background">
            {logoUrl && <Image src={logoUrl} alt="Company logo" fill className="object-cover" />}
          </div>
          <AdminForm action={uploadExperienceLogo} message="Logo updated" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={id} />
            <input name="file" type="file" accept="image/*" required className="block text-sm" />
            <button type="submit" className="admin-btn admin-btn-primary">Upload</button>
          </AdminForm>
        </div>
      </section>

      <section className="admin-card max-w-2xl space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">Workplace photos ({(photos ?? []).length}/{MAX_PHOTOS})</h2>

        {photos && photos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {photos.map((img) => (
              <div key={img.id} className="w-28 space-y-1.5">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <Image
                    src={supabase.storage.from(BUCKET).getPublicUrl(img.storage_path).data.publicUrl}
                    alt={img.caption}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="truncate text-xs text-text-subtle" title={img.caption}>{img.caption || "—"}</p>
                <AdminForm action={deleteExperiencePhoto} message="Photo removed">
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="experienceId" value={id} />
                  <input type="hidden" name="storagePath" value={img.storage_path} />
                  <button type="submit" className="admin-btn admin-btn-danger w-full px-2 py-1 text-xs">Delete</button>
                </AdminForm>
              </div>
            ))}
          </div>
        )}

        {(photos ?? []).length < MAX_PHOTOS ? (
          <AdminForm action={uploadExperiencePhoto} message="Photo uploaded" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={id} />
            <div>
              <label className="admin-label" htmlFor="caption">Caption</label>
              <input id="caption" name="caption" className="admin-input" />
            </div>
            <div>
              <label className="admin-label" htmlFor="file">Photo</label>
              <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
            </div>
            <button type="submit" className="admin-btn admin-btn-primary">Upload</button>
          </AdminForm>
        ) : (
          <p className="text-xs text-text-subtle">Maximum of {MAX_PHOTOS} photos reached — delete one to add another.</p>
        )}
      </section>
    </div>
  );
}
