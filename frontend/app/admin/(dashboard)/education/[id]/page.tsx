import DeleteButton from "@/components/admin/DeleteButton";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import EducationForm from "../EducationForm";
import { deleteEducationImage, updateEducation, uploadEducationImage } from "../actions";
import { AdminForm } from "@/components/admin/AdminFeedback";

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
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="Edit education entry" />

      <EducationForm
        education={{ id: education.id, degree: education.degree, institution: education.institution, period: education.period, detail: education.detail, images: [] }}
        action={updateEducation}
        redirectTo="/admin/education"
        submitLabel="Save changes"
      />

      <section className="admin-card max-w-2xl space-y-4 p-6">
        <h2 className="text-sm font-semibold text-foreground">Images</h2>

        {images && images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
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
                <AdminForm action={deleteEducationImage} message="Image removed">
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="educationId" value={id} />
                  <input type="hidden" name="storagePath" value={img.storage_path} />
                  <DeleteButton what="this image" className="admin-btn admin-btn-danger w-full px-2 py-1 text-xs" />
                </AdminForm>
              </div>
            ))}
          </div>
        )}

        <AdminForm action={uploadEducationImage} message="Image uploaded" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="educationId" value={education.id} />
          <div>
            <label className="admin-label" htmlFor="caption">Caption</label>
            <input id="caption" name="caption" className="admin-input" />
          </div>
          <div>
            <label className="admin-label" htmlFor="file">Image file</label>
            <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary">Upload</button>
        </AdminForm>
      </section>
    </div>
  );
}
