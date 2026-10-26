"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { queueChatbotSync } from "@/lib/chatbot-sync";
import { deleteImage, uploadNextImage } from "@/lib/storage";
import { CASE_STUDY_MAX_LENGTH, CASE_STUDY_SECTIONS, normalizeCaseStudy } from "@/lib/project-case-study";

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/projects");
  revalidatePath("/projects/[slug]", "page");
  revalidatePath("/sitemap.xml");
}

function caseStudyFields(formData: FormData) {
  if (formData.get("caseStudyEnabled") !== "true") return {};
  return {
    case_study: normalizeCaseStudy(Object.fromEntries(
      CASE_STUDY_SECTIONS.map(({ key }) => [key, String(formData.get(`caseStudy-${key}`) ?? "")])
    )),
  };
}

function caseStudyError(formData: FormData) {
  if (formData.get("caseStudyEnabled") !== "true") return undefined;
  const tooLong = CASE_STUDY_SECTIONS.find(({ key }) => String(formData.get(`caseStudy-${key}`) ?? "").length > CASE_STUDY_MAX_LENGTH);
  return tooLong ? `${tooLong.title} must be ${CASE_STUDY_MAX_LENGTH} characters or fewer.` : undefined;
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
  const validationError = caseStudyError(formData);
  if (validationError) return { error: validationError };
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
      role: String(formData.get("role") ?? "") || null,
      impact: String(formData.get("impact") ?? "") || null,
      sort_order: count ?? 0,
      ...caseStudyFields(formData),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create project" };

  queueChatbotSync();
  refresh();
  return { ok: true, redirectTo: `/admin/projects/${data.id}` };
}

export async function updateProject(formData: FormData) {
  const validationError = caseStudyError(formData);
  if (validationError) return { error: validationError };
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
      role: String(formData.get("role") ?? "") || null,
      impact: String(formData.get("impact") ?? "") || null,
      updated_at: new Date().toISOString(),
      ...caseStudyFields(formData),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  queueChatbotSync();
  refresh();
  revalidatePath(`/admin/projects/${id}`);
  return { ok: true };
}

export async function deleteProject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data: images } = await supabase.from("project_images").select("storage_path").eq("project_id", id);
  await Promise.all((images ?? []).map((img) => deleteImage(supabase, img.storage_path).catch(() => {})));

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { error: error.message };

  queueChatbotSync();
  refresh();
  return { ok: true };
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
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };

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

  if (error) return { error: error.message };

  refresh();
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

export async function setCoverImage(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");

  const supabase = await createClient();
  await supabase.from("project_images").update({ is_cover: false }).eq("project_id", projectId);
  const { error } = await supabase.from("project_images").update({ is_cover: true }).eq("id", imageId);
  if (error) return { error: error.message };

  refresh();
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProjectImage(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");

  const supabase = await createClient();
  await deleteImage(supabase, storagePath).catch(() => {});
  const { error } = await supabase.from("project_images").delete().eq("id", imageId);
  if (error) return { error: error.message };

  refresh();
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true };
}
