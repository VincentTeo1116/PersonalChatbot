"use server";

import { after } from "next/server";
import { getProfile } from "@/lib/data";
import { sendMeetingRequestEmail } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
import { validateMeetingRequest, hasErrors, type MeetingRequestErrors } from "@/lib/validation/meetingRequest";

export type MeetingRequestState =
  | { ok: true }
  | { ok: false; errors?: MeetingRequestErrors; error?: string }
  | undefined;

export async function submitMeetingRequest(
  _prevState: MeetingRequestState,
  formData: FormData
): Promise<MeetingRequestState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    position: String(formData.get("position") ?? ""),
    company: String(formData.get("company") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  // Re-validate here even though the client already checked -- client-side validation
  // is only ever a UX convenience, never a security boundary; it can be bypassed by
  // anyone submitting the form directly.
  const errors = validateMeetingRequest(input);
  if (hasErrors(errors)) return { ok: false, errors };

  const supabase = await createClient();
  const { error } = await supabase.from("meeting_requests").insert({
    name: input.name.trim().replace(/\s+/g, " "),
    position: input.position.trim(),
    company: input.company.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    message: input.message.trim() || null,
  });

  if (error) {
    // Logged server-side (never shown to the visitor) -- most likely cause is
    // 007_meeting_requests.sql not having been run yet in Supabase.
    console.error("meeting_requests insert failed:", error.message);
    return { ok: false, error: "Something went wrong submitting your request. Please try again or email me directly." };
  }

  // Runs after the response is already sent, so a slow/misconfigured/unset email
  // provider can never delay or fail the visitor's submission -- it already succeeded
  // above regardless of whether this notification goes out.
  after(async () => {
    const profile = await getProfile().catch(() => null);
    if (profile?.contact.email) {
      await sendMeetingRequestEmail(input, profile.contact.email);
    }
  });

  return { ok: true };
}
