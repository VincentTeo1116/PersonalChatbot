"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteImage, uploadNextImage } from "@/lib/storage";

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/hackathons");
}

export async function uploadHackathonPhoto(formData: FormData) {
  const caption = String(formData.get("caption") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const supabase = await createClient();
  const { count } = await supabase.from("hackathon_photos").select("*", { count: "exact", head: true });

  const { path } = await uploadNextImage(supabase, "hackathons", file);
  const { error } = await supabase.from("hackathon_photos").insert({ storage_path: path, caption, sort_order: count ?? 0 });
  if (error) throw new Error(error.message);

  refresh();
}

export async function updateHackathonCaption(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const caption = String(formData.get("caption") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("hackathon_photos").update({ caption }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteHackathonPhoto(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");
  const supabase = await createClient();
  await deleteImage(supabase, storagePath).catch(() => {});
  const { error } = await supabase.from("hackathon_photos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function moveHackathonPhoto(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const supabase = await createClient();

  const { data: rows } = await supabase.from("hackathon_photos").select("id, sort_order").order("sort_order");
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await Promise.all([
    supabase.from("hackathon_photos").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("hackathon_photos").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  refresh();
}
