import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EducationForm from "../EducationForm";
import { deleteEducationImage, updateEducation, uploadEducationImage } from "../actions";

const BUCKET = "portfolio-content";

export default async function EditEducationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: education } = await supabase.from("education").select("*").eq("id", id).single();
  if (!education) notFound();

  const { data: images } = await supabase
    .from("education_images")
    .select("*")
    .eq("education_id", id)
    .order("sort_order");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-xl font-semibold text-foreground">Edit education entry</h1>
        <EducationForm
          education={{ id: education.id, degree: education.degree, institution: education.institution, period: education.period, detail: education.detail, images: [] }}
          action={updateEducation}
          submitLabel="Save changes"
        />
      </div>

      <section className="max-w-2xl space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Images</h2>

        <div className="flex flex-wrap gap-3">
          {(images ?? []).map((img) => (
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
              <form action={deleteEducationImage}>
                <input type="hidden" name="imageId" value={img.id} />
                <input type="hidden" name="educationId" value={id} />
                <input type="hidden" name="storagePath" value={img.storage_path} />
                <button type="submit" className="w-full rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:text-red-500">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>

        <form action={uploadEducationImage} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="educationId" value={education.id} />
          <div>
            <label className="text-sm text-text-secondary" htmlFor="caption">Caption</label>
            <input
              id="caption"
              name="caption"
              className="block rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary" htmlFor="file">Image file</label>
            <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Upload
          </button>
        </form>
      </section>
    </div>
  );
}
