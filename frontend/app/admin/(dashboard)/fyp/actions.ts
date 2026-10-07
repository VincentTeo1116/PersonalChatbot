"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { queueChatbotSync } from "@/lib/chatbot-sync";
import { deleteImage, uploadNextImage } from "@/lib/storage";

export type FypFormState = { error?: string; success?: boolean } | undefined;

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/fyp");
}

function orNull(formData: FormData, name: string): string | null {
  const v = String(formData.get(name) ?? "").trim();
  return v || null;
}

export async function saveFyp(_prevState: FypFormState, formData: FormData): Promise<FypFormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fyp")
    .update({
      title: orNull(formData, "title"),
      description: orNull(formData, "description"),
      github_url: orNull(formData, "githubUrl"),
      dataset_description: orNull(formData, "datasetDescription"),
      video_url: orNull(formData, "videoUrl"),
      supervisor: orNull(formData, "supervisor"),
      lecturer_feedback: orNull(formData, "lecturerFeedback"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { error: error.message };

  queueChatbotSync();
  refresh();
  return { success: true };
}

export async function uploadFypImage(formData: FormData) {
  const makeCover = formData.get("isCover") === "on";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const supabase = await createClient();
  const { count } = await supabase.from("fyp_images").select("*", { count: "exact", head: true });

  const { path } = await uploadNextImage(supabase, "fyp", file);

  if (makeCover) {
    await supabase.from("fyp_images").update({ is_cover: false }).eq("is_cover", true);
  }

  const { error } = await supabase.from("fyp_images").insert({
    storage_path: path,
    is_cover: makeCover || count === 0,
    sort_order: count ?? 0,
  });

  if (error) throw new Error(error.message);

  refresh();
}

export async function setFypCoverImage(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");

  const supabase = await createClient();
  await supabase.from("fyp_images").update({ is_cover: false }).eq("is_cover", true);
  const { error } = await supabase.from("fyp_images").update({ is_cover: true }).eq("id", imageId);
  if (error) throw new Error(error.message);

  refresh();
}

export async function deleteFypImage(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");

  const supabase = await createClient();
  await deleteImage(supabase, storagePath).catch(() => {});
  const { error } = await supabase.from("fyp_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);

  refresh();
}
