"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteImage, uploadNextImage } from "@/lib/storage";
import { requireAdmin } from "@/lib/auth";
import { safeUrl } from "@/lib/safe-url";

// Blank is allowed (no link). Anything typed must be a web address, so a bad value is reported instead of silently dropped.
function readLink(formData: FormData): { linkUrl: string | null } | { error: string } {
  const raw = String(formData.get("linkUrl") ?? "").trim();
  if (!raw) return { linkUrl: null };
  const url = safeUrl(raw);
  if (!/^https?:\/\//i.test(url)) return { error: "The link must start with https://" };
  return { linkUrl: url };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/hackathons");
}

export async function uploadHackathonPhoto(formData: FormData) {
  await requireAdmin();
  const caption = String(formData.get("caption") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };
  const link = readLink(formData);
  if ("error" in link) return link;

  const supabase = await createClient();
  const { count } = await supabase.from("hackathon_photos").select("*", { count: "exact", head: true });

  const { path } = await uploadNextImage(supabase, "hackathons", file);
  const { error } = await supabase.from("hackathon_photos").insert({ storage_path: path, caption, link_url: link.linkUrl, sort_order: count ?? 0 });
  if (error) return { error: error.message };

  refresh();
  return { ok: true };
}

export async function updateHackathonCaption(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const caption = String(formData.get("caption") ?? "");
  const link = readLink(formData);
  if ("error" in link) return link;
  const supabase = await createClient();
  const { error } = await supabase.from("hackathon_photos").update({ caption, link_url: link.linkUrl }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteHackathonPhoto(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");
  const supabase = await createClient();
  await deleteImage(supabase, storagePath).catch(() => {});
  const { error } = await supabase.from("hackathon_photos").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function moveHackathonPhoto(formData: FormData) {
  await requireAdmin();
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
