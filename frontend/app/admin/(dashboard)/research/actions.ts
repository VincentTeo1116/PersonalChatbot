"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { queueChatbotSync } from "@/lib/chatbot-sync";
import { uploadNextImage } from "@/lib/storage";
import { editorialSeoFields } from "@/lib/editorial-seo";
import { CASE_STUDY_MAX_LENGTH, CASE_STUDY_SECTIONS, normalizeCaseStudy } from "@/lib/project-case-study";

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/research");
  revalidatePath("/research");
  revalidatePath("/research/[slug]", "page");
  revalidatePath("/sitemap.xml");
}

function researchDetails(formData: FormData) {
  return formData.get("researchDetailsEnabled") === "true" ? {
    case_study: normalizeCaseStudy(Object.fromEntries(CASE_STUDY_SECTIONS.map(({ key }) => [key, String(formData.get(`research-${key}`) ?? "")]))),
  } : {};
}

function detailsError(formData: FormData) {
  if (formData.get("researchDetailsEnabled") !== "true") return undefined;
  const tooLong = CASE_STUDY_SECTIONS.find(({ key }) => String(formData.get(`research-${key}`) ?? "").length > CASE_STUDY_MAX_LENGTH);
  return tooLong ? `${tooLong.title} must be ${CASE_STUDY_MAX_LENGTH} characters or fewer.` : undefined;
}

export async function createResearch(formData: FormData) {
  const validationError = detailsError(formData);
  if (validationError) return { error: validationError };
  const supabase = await createClient();
  const { count } = await supabase.from("research").select("*", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("research")
    .insert({
      slug: String(formData.get("slug") ?? ""),
      title: String(formData.get("title") ?? ""),
      venue: String(formData.get("venue") ?? ""),
      authors: String(formData.get("authors") ?? "").split(",").map((a) => a.trim()).filter(Boolean),
      supervisor: String(formData.get("supervisor") ?? ""),
      doi: String(formData.get("doi") ?? ""),
      doi_url: String(formData.get("doiUrl") ?? ""),
      description: String(formData.get("description") ?? ""),
      sort_order: count ?? 0,
      ...researchDetails(formData),
      ...editorialSeoFields(formData),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create research entry" };

  queueChatbotSync();
  refresh();
  return { ok: true, redirectTo: `/admin/research/${data.id}` };
}

export async function updateResearch(formData: FormData) {
  const validationError = detailsError(formData);
  if (validationError) return { error: validationError };
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("research")
    .update({
      slug: String(formData.get("slug") ?? ""),
      title: String(formData.get("title") ?? ""),
      venue: String(formData.get("venue") ?? ""),
      authors: String(formData.get("authors") ?? "").split(",").map((a) => a.trim()).filter(Boolean),
      supervisor: String(formData.get("supervisor") ?? ""),
      doi: String(formData.get("doi") ?? ""),
      doi_url: String(formData.get("doiUrl") ?? ""),
      description: String(formData.get("description") ?? ""),
      updated_at: new Date().toISOString(),
      ...researchDetails(formData),
      ...editorialSeoFields(formData),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  queueChatbotSync();
  refresh();
  revalidatePath(`/admin/research/${id}`);
  return { ok: true };
}

export async function deleteResearch(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("research").delete().eq("id", id);
  if (error) return { error: error.message };
  queueChatbotSync();
  refresh();
  return { ok: true };
}

export async function moveResearch(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const supabase = await createClient();

  const { data: rows } = await supabase.from("research").select("id, sort_order").order("sort_order");
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await Promise.all([
    supabase.from("research").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("research").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  refresh();
}

export async function uploadResearchImage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };

  const supabase = await createClient();
  const { path } = await uploadNextImage(supabase, `research/${id}`, file);
  const { error } = await supabase.from("research").update({ image_path: path }).eq("id", id);
  if (error) return { error: error.message };

  refresh();
  revalidatePath(`/admin/research/${id}`);
  return { ok: true };
}
