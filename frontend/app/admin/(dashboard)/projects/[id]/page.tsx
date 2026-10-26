import DeleteButton from "@/components/admin/DeleteButton";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import ProjectForm from "../ProjectForm";
import { deleteProjectImage, setCoverImage, updateProject, uploadProjectImage } from "../actions";
import { AdminForm } from "@/components/admin/AdminFeedback";
import { normalizeCaseStudy } from "@/lib/project-case-study";

const BUCKET = "portfolio-content";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!project) notFound();

  const { data: images } = await supabase
    .from("project_images")
    .select("*")
    .eq("project_id", id)
    .order("sort_order");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="Edit project" />

      <ProjectForm
        project={{
          id: project.id,
          slug: project.slug,
          title: project.title,
          description: project.description,
          tags: project.tags ?? [],
          image: "",
          links: project.links ?? [],
          demoVideoUrl: project.demo_video_url ?? undefined,
          featured: project.featured ?? undefined,
          award: project.award ?? undefined,
          role: project.role ?? undefined,
          impact: project.impact ?? undefined,
          caseStudy: normalizeCaseStudy(project.case_study),
          updatedAt: project.updated_at,
        }}
        action={updateProject}
        caseStudyEnabled={"case_study" in project}
        redirectTo="/admin/projects"
        submitLabel="Save changes"
      />

      <section className="admin-card max-w-2xl space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Images</h2>
          <p className="mt-1 text-xs text-text-subtle">The cover image is used as the project card thumbnail; the rest appear as screenshots.</p>
        </div>

        {images && images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="w-28 space-y-1.5">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <Image
                    src={supabase.storage.from(BUCKET).getPublicUrl(img.storage_path).data.publicUrl}
                    alt=""
                    fill
                    className="object-cover"
                  />
                  {img.is_cover && (
                    <span className="admin-badge absolute left-1.5 top-1.5 bg-indigo-500 text-white">Cover</span>
                  )}
                </div>
                {!img.is_cover && (
                  <AdminForm action={setCoverImage} message="Cover image updated">
                    <input type="hidden" name="imageId" value={img.id} />
                    <input type="hidden" name="projectId" value={id} />
                    <button type="submit" className="admin-btn admin-btn-ghost w-full px-2 py-1 text-xs">Make cover</button>
                  </AdminForm>
                )}
                <AdminForm action={deleteProjectImage} message="Image removed">
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="projectId" value={id} />
                  <input type="hidden" name="storagePath" value={img.storage_path} />
                  <DeleteButton what="this image" className="admin-btn admin-btn-danger w-full px-2 py-1 text-xs" />
                </AdminForm>
              </div>
            ))}
          </div>
        )}

        <AdminForm action={uploadProjectImage} message="Image uploaded" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="projectId" value={id} />
          <div>
            <label className="admin-label" htmlFor="file">Image file</label>
            <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-text-secondary">
            <input type="checkbox" name="isCover" />
            Set as cover
          </label>
          <button type="submit" className="admin-btn admin-btn-primary">Upload</button>
        </AdminForm>
      </section>
    </div>
  );
}
