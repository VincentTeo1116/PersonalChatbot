"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadNextImage } from "@/lib/storage";

export type ProfileFormState = { error?: string; success?: boolean } | undefined;

export async function saveProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  let skills: { category: string; items: string[] }[];
  try {
    skills = JSON.parse(String(formData.get("skills") ?? "[]"));
  } catch {
    return { error: "Invalid skills data." };
  }

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
      skills: skills.map((s, i) => ({ ...s, sort_order: i })),
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
