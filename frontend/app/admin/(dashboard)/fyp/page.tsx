import Image from "next/image";
import { getFyp } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import FypForm from "./FypForm";
import { deleteFypImage, setFypCoverImage, uploadFypImage } from "./actions";

const BUCKET = "portfolio-content";

export default async function FypPage() {
  const [fyp, supabase] = await Promise.all([getFyp(), createClient()]);
  const { data: images } = await supabase.from("fyp_images").select("*").order("sort_order");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-xl font-semibold text-foreground">Final Year Project</h1>
        <p className="mb-6 max-w-2xl text-sm text-text-subtle">
          Leave the title blank to show a &quot;Coming Soon&quot; card on the public site instead of this section.
        </p>
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
      </div>

      <section className="max-w-2xl space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Screenshots</h2>
        <p className="text-xs text-text-subtle">
          The cover image is shown first; the rest appear as additional screenshots.
        </p>

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
                <form action={setFypCoverImage}>
                  <input type="hidden" name="imageId" value={img.id} />
                  <button type="submit" className="w-full rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:text-foreground">
                    Make cover
                  </button>
                </form>
              )}
              <form action={deleteFypImage}>
                <input type="hidden" name="imageId" value={img.id} />
                <input type="hidden" name="storagePath" value={img.storage_path} />
                <button type="submit" className="w-full rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:text-red-500">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>

        <form action={uploadFypImage} className="flex flex-wrap items-end gap-2">
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
