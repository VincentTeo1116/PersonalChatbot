"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { queueChatbotSync } from "@/lib/chatbot-sync";
import { uploadNextImage } from "@/lib/storage";

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/research");
}

export async function createResearch(formData: FormData) {
  queueChatbotSync();
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
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create research entry");

  refresh();
  redirect(`/admin/research/${data.id}`);
}

export async function updateResearch(formData: FormData) {
  queueChatbotSync();
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
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/research/${id}`);
}

export async function deleteResearch(formData: FormData) {
  queueChatbotSync();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("research").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
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
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const supabase = await createClient();
  const { path } = await uploadNextImage(supabase, `research/${id}`, file);
  const { error } = await supabase.from("research").update({ image_path: path }).eq("id", id);
  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/research/${id}`);
}
