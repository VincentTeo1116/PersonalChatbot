"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/data";
import { sendMeetingReplyEmail } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";

export async function deleteMeetingRequest(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("meeting_requests").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/meeting-requests");
}

export type ReplyState = { ok: true } | { ok: false; error: string } | undefined;

export async function replyToMeetingRequest(_prevState: ReplyState, formData: FormData): Promise<ReplyState> {
  const id = String(formData.get("id") ?? "");
  const requesterName = String(formData.get("requesterName") ?? "");
  const requesterEmail = String(formData.get("requesterEmail") ?? "");
  const replyMessage = String(formData.get("replyMessage") ?? "").trim();

  if (!replyMessage) return { ok: false, error: "Write a reply before sending." };

  const profile = await getProfile();
  const result = await sendMeetingReplyEmail({
    to: requesterEmail,
    requesterName,
    replyMessage,
    ownerEmail: profile.contact.email,
    ownerName: profile.name,
  });

  // Only mark it "replied" if the email actually went out -- otherwise the admin would
  // believe they responded when nothing was sent.
  if (!result.sent) return { ok: false, error: result.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("meeting_requests")
    .update({ status: "replied", reply_message: replyMessage, replied_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: `Email sent, but failed to save the reply: ${error.message}` };

  revalidatePath("/admin/meeting-requests");
  return { ok: true };
}
