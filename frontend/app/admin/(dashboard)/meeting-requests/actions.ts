"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteMeetingRequest(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("meeting_requests").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/meeting-requests");
}
