"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { queueChatbotSync } from "@/lib/chatbot-sync";
import { deleteImage, uploadNextImage } from "@/lib/storage";

const MAX_PHOTOS = 2;

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/experience");
}

export async function createExperience(formData: FormData) {
  queueChatbotSync();
  const supabase = await createClient();
  const { count } = await supabase.from("work_experience").select("*", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("work_experience")
    .insert({
      role: String(formData.get("role") ?? ""),
      company: String(formData.get("company") ?? ""),
      period: String(formData.get("period") ?? ""),
      detail: String(formData.get("detail") ?? ""),
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create work experience entry");

  refresh();
  redirect(`/admin/experience/${data.id}`);
}

export async function updateExperience(formData: FormData) {
  queueChatbotSync();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("work_experience")
    .update({
      role: String(formData.get("role") ?? ""),
      company: String(formData.get("company") ?? ""),
      period: String(formData.get("period") ?? ""),
      detail: String(formData.get("detail") ?? ""),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/experience/${id}`);
}

export async function deleteExperience(formData: FormData) {
  queueChatbotSync();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data: images } = await supabase
    .from("work_experience_images")
    .select("storage_path")
    .eq("work_experience_id", id);
  await Promise.all((images ?? []).map((img) => deleteImage(supabase, img.storage_path).catch(() => {})));

  const { data: row } = await supabase.from("work_experience").select("logo_path").eq("id", id).single();
  if (row?.logo_path) await deleteImage(supabase, row.logo_path).catch(() => {});

  const { error } = await supabase.from("work_experience").delete().eq("id", id);
  if (error) throw new Error(error.message);

  refresh();
}

export async function moveExperience(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const supabase = await createClient();

  const { data: rows } = await supabase.from("work_experience").select("id, sort_order").order("sort_order");
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await Promise.all([
    supabase.from("work_experience").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("work_experience").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  refresh();
}

export async function uploadExperienceLogo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const supabase = await createClient();
  const { path } = await uploadNextImage(supabase, `work-experience/${id}/logo`, file);
  const { error } = await supabase.from("work_experience").update({ logo_path: path }).eq("id", id);
  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/experience/${id}`);
}

export async function uploadExperiencePhoto(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const caption = String(formData.get("caption") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const supabase = await createClient();
  const { count } = await supabase
    .from("work_experience_images")
    .select("*", { count: "exact", head: true })
    .eq("work_experience_id", id);

  if ((count ?? 0) >= MAX_PHOTOS) {
    throw new Error(`Maximum of ${MAX_PHOTOS} workplace photos — delete one before adding another.`);
  }

  const { path } = await uploadNextImage(supabase, `work-experience/${id}/photos`, file);
  const { error } = await supabase
    .from("work_experience_images")
    .insert({ work_experience_id: id, storage_path: path, caption, sort_order: count ?? 0 });

  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/experience/${id}`);
}

export async function deleteExperiencePhoto(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");
  const experienceId = String(formData.get("experienceId") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");

  const supabase = await createClient();
  await deleteImage(supabase, storagePath).catch(() => {});
  const { error } = await supabase.from("work_experience_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/experience/${experienceId}`);
}
