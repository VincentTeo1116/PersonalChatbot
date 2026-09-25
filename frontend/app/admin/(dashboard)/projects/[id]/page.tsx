import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectForm from "../ProjectForm";
import { deleteProjectImage, setCoverImage, updateProject, uploadProjectImage } from "../actions";

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
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-xl font-semibold text-foreground">Edit project</h1>
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
          }}
          action={updateProject}
          submitLabel="Save changes"
        />
      </div>

      <section className="max-w-2xl space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Images</h2>
        <p className="text-xs text-text-subtle">The cover image is used as the project card thumbnail; the rest appear as screenshots.</p>

        <div className="flex flex-wrap gap-3">
          {(images ?? []).map((img) => (
            <div key={img.id} className="w-28 space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <Image
                  src={supabase.storage.from(BUCKET).getPublicUrl(img.storage_path).data.publicUrl}
                  alt=""
                  fill
                  className="object-cover"
                />
                {img.is_cover && (
                  <span className="absolute top-1 left-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
              </div>
              {!img.is_cover && (
                <form action={setCoverImage}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="projectId" value={id} />
                  <button type="submit" className="w-full rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:text-foreground">
                    Make cover
                  </button>
                </form>
              )}
              <form action={deleteProjectImage}>
                <input type="hidden" name="imageId" value={img.id} />
                <input type="hidden" name="projectId" value={id} />
                <input type="hidden" name="storagePath" value={img.storage_path} />
                <button type="submit" className="w-full rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:text-red-500">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>

        <form action={uploadProjectImage} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="projectId" value={id} />
          <div>
            <label className="text-sm text-text-secondary" htmlFor="file">Image file</label>
            <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-text-secondary">
            <input type="checkbox" name="isCover" />
            Set as cover
          </label>
          <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">
            Upload
          </button>
        </form>
      </section>
    </div>
  );
}
