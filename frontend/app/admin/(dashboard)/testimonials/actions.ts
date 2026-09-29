"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { queueChatbotSync } from "@/lib/chatbot-sync";
import { deleteImage, uploadNextImage } from "@/lib/storage";

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/testimonials");
}

export async function createTestimonial(formData: FormData) {
  queueChatbotSync();
  const supabase = await createClient();
  const { count } = await supabase.from("testimonials").select("*", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      author_name: String(formData.get("authorName") ?? ""),
      author_role: String(formData.get("authorRole") ?? ""),
      quote: String(formData.get("quote") ?? ""),
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create testimonial");

  refresh();
  redirect(`/admin/testimonials/${data.id}`);
}

export async function updateTestimonial(formData: FormData) {
  queueChatbotSync();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("testimonials")
    .update({
      author_name: String(formData.get("authorName") ?? ""),
      author_role: String(formData.get("authorRole") ?? ""),
      quote: String(formData.get("quote") ?? ""),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/testimonials/${id}`);
}

export async function deleteTestimonial(formData: FormData) {
  queueChatbotSync();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();

  const { data: row } = await supabase.from("testimonials").select("avatar_path").eq("id", id).single();
  if (row?.avatar_path) await deleteImage(supabase, row.avatar_path).catch(() => {});

  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function moveTestimonial(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const supabase = await createClient();

  const { data: rows } = await supabase.from("testimonials").select("id, sort_order").order("sort_order");
  if (!rows) return;

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWith];
  await Promise.all([
    supabase.from("testimonials").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("testimonials").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  refresh();
}

export async function uploadTestimonialAvatar(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const supabase = await createClient();
  const { path } = await uploadNextImage(supabase, `testimonials/${id}`, file);
  const { error } = await supabase.from("testimonials").update({ avatar_path: path }).eq("id", id);
  if (error) throw new Error(error.message);

  refresh();
  revalidatePath(`/admin/testimonials/${id}`);
}
