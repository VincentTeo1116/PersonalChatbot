"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/data";
import { sendMeetingReplyEmail } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function deleteMeetingRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("meeting_requests").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/meeting-requests");
  return { ok: true };
}

export type ReplyState = { ok: true } | { ok: false; error: string } | undefined;

export async function replyToMeetingRequest(_prevState: ReplyState, formData: FormData): Promise<ReplyState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const replyMessage = String(formData.get("replyMessage") ?? "").trim();

  if (!replyMessage) return { ok: false, error: "Write a reply before sending." };
  if (replyMessage.length > 5000) return { ok: false, error: "That reply is too long." };

  // The recipient is read from the stored request, never from the form, so this can only ever answer a real enquiry.
  const supabase = await createClient();
  const { data: request, error: lookupError } = await supabase
    .from("meeting_requests")
    .select("name, email")
    .eq("id", id)
    .maybeSingle();
  if (lookupError || !request) return { ok: false, error: "That meeting request no longer exists." };

  const profile = await getProfile();
  const result = await sendMeetingReplyEmail({
    to: request.email,
    requesterName: request.name,
    replyMessage,
    ownerEmail: profile.contact.email,
    ownerName: profile.name,
  });

  // Only mark it "replied" if the email actually went out -- otherwise the admin would believe they responded when nothing was sent.
  if (!result.sent) return { ok: false, error: result.error };

  const { error } = await supabase
    .from("meeting_requests")
    .update({ status: "replied", reply_message: replyMessage, replied_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: `Email sent, but failed to save the reply: ${error.message}` };

  revalidatePath("/admin/meeting-requests");
  return { ok: true };
}
