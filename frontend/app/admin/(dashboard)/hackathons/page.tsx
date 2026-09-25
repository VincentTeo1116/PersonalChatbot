import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  deleteHackathonPhoto,
  moveHackathonPhoto,
  updateHackathonCaption,
  uploadHackathonPhoto,
} from "./actions";

const BUCKET = "portfolio-content";

export default async function HackathonsAdminPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("hackathon_photos").select("*").order("sort_order");
  const photos = (rows ?? []).map((row) => ({
    id: row.id,
    caption: row.caption,
    storagePath: row.storage_path,
    src: supabase.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl,
  }));

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">Hackathons</h1>

      <form action={uploadHackathonPhoto} className="mb-8 flex flex-wrap items-end gap-2">
        <div>
          <label className="text-sm text-text-secondary" htmlFor="caption">Caption</label>
          <input
            id="caption"
            name="caption"
            placeholder="[Hackathon name] — [Year], [what happened]"
            className="block w-72 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400"
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, i) => (
          <div key={photo.id} className="space-y-2 rounded-xl border border-border bg-surface p-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image src={photo.src} alt={photo.caption} fill className="object-cover" />
            </div>

            <form action={updateHackathonCaption} className="flex gap-2">
              <input type="hidden" name="id" value={photo.id} />
              <input
                name="caption"
                defaultValue={photo.caption}
                className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-indigo-400"
              />
              <button type="submit" className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:text-foreground">
                Save
              </button>
            </form>

            <div className="flex items-center gap-2">
              <form action={moveHackathonPhoto}>
                <input type="hidden" name="id" value={photo.id} />
                <input type="hidden" name="direction" value="up" />
                <button type="submit" disabled={i === 0} className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-30">
                  ↑
                </button>
              </form>
              <form action={moveHackathonPhoto}>
                <input type="hidden" name="id" value={photo.id} />
                <input type="hidden" name="direction" value="down" />
                <button type="submit" disabled={i === photos.length - 1} className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary disabled:opacity-30">
                  ↓
                </button>
              </form>
              <form action={deleteHackathonPhoto} className="ml-auto">
                <input type="hidden" name="id" value={photo.id} />
                <input type="hidden" name="storagePath" value={photo.storagePath} />
                <button type="submit" className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:text-red-500">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
