import Image from "next/image";
import { getFyp } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import FypForm from "./FypForm";
import { deleteFypImage, setFypCoverImage, uploadFypImage } from "./actions";

const BUCKET = "portfolio-content";

export default async function FypPage() {
  const [fyp, supabase] = await Promise.all([getFyp(), createClient()]);
  const { data: images } = await supabase.from("fyp_images").select("*").order("sort_order");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Final Year Project"
        description="Leave the title blank to show a &quot;Coming Soon&quot; card on the public site instead."
      />

      <FypForm
        fyp={
          fyp ?? {
            title: null,
            description: null,
            githubUrl: null,
            datasetDescription: null,
            videoUrl: null,
            supervisor: null,
            lecturerFeedback: null,
            images: [],
          }
        }
      />

      <section className="admin-card max-w-2xl space-y-4 p-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Screenshots</h2>
          <p className="mt-1 text-xs text-text-subtle">The cover image is shown first; the rest appear as additional screenshots.</p>
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
                  <form action={setFypCoverImage}>
                    <input type="hidden" name="imageId" value={img.id} />
                    <button type="submit" className="admin-btn admin-btn-ghost w-full px-2 py-1 text-xs">Make cover</button>
                  </form>
                )}
                <form action={deleteFypImage}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="storagePath" value={img.storage_path} />
                  <button type="submit" className="admin-btn admin-btn-danger w-full px-2 py-1 text-xs">Delete</button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={uploadFypImage} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="admin-label" htmlFor="file">Image file</label>
            <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-text-secondary">
            <input type="checkbox" name="isCover" />
            Set as cover
          </label>
          <button type="submit" className="admin-btn admin-btn-primary">Upload</button>
        </form>
      </section>
    </div>
  );
}
