"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { queueChatbotSync } from "@/lib/chatbot-sync";
import { deleteImage, uploadNextImage } from "@/lib/storage";

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/education");
}

export async function createEducation(formData: FormData) {
  queueChatbotSync();
  const supabase = await createClient();
  const { count } = await supabase.from("education").select("*", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("education")
    .insert({
      degree: String(formData.get("degree") ?? ""),
      institution: String(formData.get("institution") ?? ""),
      period: String(formData.get("period") ?? ""),
      detail: String(formData.get("detail") ?? ""),
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create education entry");

  refresh();
  redirect(`/admin/education/${data.id}`);
}

export async function updateEducation(formData: FormData) {
  queueChatbotSync();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("education")
    .update({
      degree: String(formData.get("degree") ?? ""),
      institution: String(formData.get("institution") ?? ""),
      period: String(formData.get("period") ?? ""),
      detail: String(formData.get("detail") ?? ""),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/education/${id}`);
}

export async function deleteEducation(formData: FormData) {
  queueChatbotSync();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data: images } = await supabase.from("education_images").select("storage_path").eq("education_id", id);
  await Promise.all((images ?? []).map((img) => deleteImage(supabase, img.storage_path).catch(() => {})));

  const { error } = await supabase.from("education").delete().eq("id", id);
  if (error) throw new Error(error.message);

  refresh();
}

export async function moveEducation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const supabase = await createClient();

  const { data: rows } = await supabase.from("education").select("id, sort_order").order("sort_order");
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await Promise.all([
    supabase.from("education").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("education").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  refresh();
}

export async function uploadEducationImage(formData: FormData) {
  const educationId = String(formData.get("educationId") ?? "");
  const caption = String(formData.get("caption") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const supabase = await createClient();
  const { count } = await supabase
    .from("education_images")
    .select("*", { count: "exact", head: true })
    .eq("education_id", educationId);

  const { path } = await uploadNextImage(supabase, `education/${educationId}`, file);
  const { error } = await supabase
    .from("education_images")
    .insert({ education_id: educationId, storage_path: path, caption, sort_order: count ?? 0 });

  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/education/${educationId}`);
}

export async function deleteEducationImage(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");
  const educationId = String(formData.get("educationId") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");

  const supabase = await createClient();
  await deleteImage(supabase, storagePath).catch(() => {});
  const { error } = await supabase.from("education_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/education/${educationId}`);
}
