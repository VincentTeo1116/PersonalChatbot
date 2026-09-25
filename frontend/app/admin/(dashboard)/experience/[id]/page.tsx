import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExperienceForm from "../ExperienceForm";
import {
  deleteExperiencePhoto,
  updateExperience,
  uploadExperienceLogo,
  uploadExperiencePhoto,
} from "../actions";

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
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-xl font-semibold text-foreground">Edit work experience entry</h1>
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
          submitLabel="Save changes"
        />
      </div>

      <section className="max-w-2xl space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Company logo</h2>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-surface">
            {logoUrl && <Image src={logoUrl} alt="Company logo" fill className="object-cover" />}
          </div>
          <form action={uploadExperienceLogo} className="flex items-end gap-2">
            <input type="hidden" name="id" value={id} />
            <input name="file" type="file" accept="image/*" required className="block text-sm" />
            <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
              Upload
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-2xl space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Workplace photos ({(photos ?? []).length}/{MAX_PHOTOS})</h2>

        <div className="flex flex-wrap gap-3">
          {(photos ?? []).map((img) => (
            <div key={img.id} className="w-28 space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <Image
                  src={supabase.storage.from(BUCKET).getPublicUrl(img.storage_path).data.publicUrl}
                  alt={img.caption}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="truncate text-xs text-text-subtle" title={img.caption}>
                {img.caption || "—"}
              </p>
              <form action={deleteExperiencePhoto}>
                <input type="hidden" name="imageId" value={img.id} />
                <input type="hidden" name="experienceId" value={id} />
                <input type="hidden" name="storagePath" value={img.storage_path} />
                <button type="submit" className="w-full rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:text-red-500">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>

        {(photos ?? []).length < MAX_PHOTOS ? (
          <form action={uploadExperiencePhoto} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={id} />
            <div>
              <label className="text-sm text-text-secondary" htmlFor="caption">Caption</label>
              <input
                id="caption"
                name="caption"
                className="block rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary" htmlFor="file">Photo</label>
              <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
            </div>
            <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
              Upload
            </button>
          </form>
        ) : (
          <p className="text-xs text-text-subtle">Maximum of {MAX_PHOTOS} photos reached — delete one to add another.</p>
        )}
      </section>
    </div>
  );
}
