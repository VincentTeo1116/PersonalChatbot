"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { queueChatbotSync } from "@/lib/chatbot-sync";
import { deleteImage, extOf, uploadFixedFile, uploadNextImage } from "@/lib/storage";

export type ProfileFormState = { error?: string; success?: boolean } | undefined;

type SkillItemInput = { name: string; level: number };
type SkillCategoryInput = { category: string; items: SkillItemInput[] };

export async function saveProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  let skills: SkillCategoryInput[];
  try {
    skills = JSON.parse(String(formData.get("skills") ?? "[]"));
  } catch {
    return { error: "Invalid skills data." };
  }

  // Defensive clamp -- the admin UI only ever sends 1-5, but guard the stored data
  // against anything malformed slipping through (e.g. a hand-edited request).
  const cleanSkills = skills.map((s, i) => ({
    category: s.category,
    sort_order: i,
    items: (s.items ?? [])
      .filter((it) => it && it.name)
      .map((it) => ({ name: it.name, level: Math.max(1, Math.min(5, Math.round(Number(it.level) || 4))) })),
  }));

  const statCgpaRaw = String(formData.get("statCgpa") ?? "").trim();
  const statHackathonsRaw = String(formData.get("statHackathons") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profile")
    .update({
      name: String(formData.get("name") ?? ""),
      tagline: String(formData.get("tagline") ?? ""),
      location: String(formData.get("location") ?? ""),
      hero_summary: String(formData.get("heroSummary") ?? ""),
      about: String(formData.get("about") ?? ""),
      skills: cleanSkills,
      stat_cgpa: statCgpaRaw ? Number(statCgpaRaw) : null,
      stat_hackathons: statHackathonsRaw ? Number(statHackathonsRaw) : null,
      contact_email: String(formData.get("contactEmail") ?? ""),
      contact_github: String(formData.get("contactGithub") ?? ""),
      contact_linkedin: String(formData.get("contactLinkedin") ?? ""),
      contact_resume_url: String(formData.get("contactResumeUrl") ?? ""),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { error: error.message };

  queueChatbotSync();
  revalidatePath("/");
  revalidatePath("/admin/profile");
  return { success: true };
}

export async function uploadAvatar(formData: FormData): Promise<{ publicUrl?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };

  const supabase = await createClient();
  try {
    const { path, publicUrl } = await uploadNextImage(supabase, "profile", file);
    const { error } = await supabase.from("profile").update({ avatar_path: path }).eq("id", 1);
    if (error) return { error: error.message };

    revalidatePath("/");
    revalidatePath("/admin/profile");
    return { publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function uploadResume(formData: FormData): Promise<{ publicUrl?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };
  // The inline preview modal embeds this in an <iframe>, which only reliably renders
  // PDFs across browsers -- reject anything else up front rather than accept a file
  // that would silently fail to preview later.
  if (file.type !== "application/pdf") return { error: "Please upload a PDF file." };

  const supabase = await createClient();
  try {
    const { data: current } = await supabase.from("profile").select("resume_path").eq("id", 1).single();
    const { path, publicUrl } = await uploadFixedFile(supabase, "profile", `resume${extOf(file.name)}`, file);

    // Clean up a stale file from a previous upload with a different extension (rare,
    // since we only accept PDFs now, but harmless to guard against old data).
    if (current?.resume_path && current.resume_path !== path) {
      await deleteImage(supabase, current.resume_path).catch(() => {});
    }

    const { error } = await supabase.from("profile").update({ resume_path: path }).eq("id", 1);
    if (error) return { error: error.message };

    revalidatePath("/");
    revalidatePath("/admin/profile");
    return { publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }
}
