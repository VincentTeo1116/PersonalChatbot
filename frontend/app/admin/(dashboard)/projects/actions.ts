"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteImage, uploadNextImage } from "@/lib/storage";

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/projects");
}

function parseLinks(raw: string): { label: string; url: string }[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const { count } = await supabase.from("projects").select("*", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("projects")
    .insert({
      slug: String(formData.get("slug") ?? ""),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      links: parseLinks(String(formData.get("links") ?? "[]")),
      demo_video_url: String(formData.get("demoVideoUrl") ?? "") || null,
      featured: formData.get("featured") === "on",
      award: String(formData.get("award") ?? "") || null,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create project");

  refresh();
  redirect(`/admin/projects/${data.id}`);
}

export async function updateProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      slug: String(formData.get("slug") ?? ""),
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      tags: String(formData.get("tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      links: parseLinks(String(formData.get("links") ?? "[]")),
      demo_video_url: String(formData.get("demoVideoUrl") ?? "") || null,
      featured: formData.get("featured") === "on",
      award: String(formData.get("award") ?? "") || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data: images } = await supabase.from("project_images").select("storage_path").eq("project_id", id);
  await Promise.all((images ?? []).map((img) => deleteImage(supabase, img.storage_path).catch(() => {})));

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);

  refresh();
}

export async function moveProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const supabase = await createClient();

  const { data: rows } = await supabase.from("projects").select("id, sort_order").order("sort_order");
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await Promise.all([
    supabase.from("projects").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("projects").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  refresh();
}

export async function uploadProjectImage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const makeCover = formData.get("isCover") === "on";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const supabase = await createClient();
  const { count } = await supabase
    .from("project_images")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { path } = await uploadNextImage(supabase, `projects/${projectId}`, file);

  if (makeCover) {
    await supabase.from("project_images").update({ is_cover: false }).eq("project_id", projectId);
  }

  const { error } = await supabase.from("project_images").insert({
    project_id: projectId,
    storage_path: path,
    is_cover: makeCover || count === 0,
    sort_order: count ?? 0,
  });

  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function setCoverImage(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");

  const supabase = await createClient();
  await supabase.from("project_images").update({ is_cover: false }).eq("project_id", projectId);
  const { error } = await supabase.from("project_images").update({ is_cover: true }).eq("id", imageId);
  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/projects/${projectId}`);
}

export async function deleteProjectImage(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");

  const supabase = await createClient();
  await deleteImage(supabase, storagePath).catch(() => {});
  const { error } = await supabase.from("project_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/projects/${projectId}`);
}
