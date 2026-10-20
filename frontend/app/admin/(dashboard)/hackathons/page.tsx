import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import {
  deleteHackathonPhoto,
  moveHackathonPhoto,
  updateHackathonCaption,
  uploadHackathonPhoto,
} from "./actions";
import { AdminForm } from "@/components/admin/AdminFeedback";

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
      <PageHeader eyebrow="Content" title="Hackathons" description="Photos shown in the Hackathons gallery on the public site." />

      <AdminForm action={uploadHackathonPhoto} message="Photo uploaded" className="admin-card mb-6 flex flex-wrap items-end gap-3 p-6">
        <div>
          <label className="admin-label" htmlFor="caption">Caption</label>
          <input id="caption" name="caption" placeholder="[Hackathon name] — [Year], [what happened]" className="admin-input sm:w-72" />
        </div>
        <div>
          <label className="admin-label" htmlFor="file">Photo</label>
          <input id="file" name="file" type="file" accept="image/*" required className="block text-sm" />
        </div>
        <button type="submit" className="admin-btn admin-btn-primary">Upload</button>
      </AdminForm>

      {photos.length === 0 ? (
        <p className="admin-card p-6 text-sm text-text-secondary">No hackathon photos yet -- upload your first one above.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, i) => (
            <div key={photo.id} className="admin-card space-y-2 p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image src={photo.src} alt={photo.caption} fill className="object-cover" />
              </div>

              <AdminForm action={updateHackathonCaption} message="Caption saved" className="flex gap-2">
                <input type="hidden" name="id" value={photo.id} />
                <input name="caption" defaultValue={photo.caption} className="admin-input flex-1 px-2 py-1 text-xs" />
                <button type="submit" className="admin-btn admin-btn-ghost px-2 py-1 text-xs">Save</button>
              </AdminForm>

              <div className="flex items-center gap-2">
                <form action={moveHackathonPhoto}>
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="admin-btn admin-btn-ghost px-2 py-1 text-xs disabled:opacity-30">↑</button>
                </form>
                <form action={moveHackathonPhoto}>
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === photos.length - 1} className="admin-btn admin-btn-ghost px-2 py-1 text-xs disabled:opacity-30">↓</button>
                </form>
                <AdminForm action={deleteHackathonPhoto} message="Photo deleted" className="ml-auto">
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="storagePath" value={photo.storagePath} />
                  <button type="submit" className="admin-btn admin-btn-danger px-2 py-1 text-xs">Delete</button>
                </AdminForm>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
