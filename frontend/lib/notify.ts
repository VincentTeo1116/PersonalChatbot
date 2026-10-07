import "server-only";
import type { MeetingRequestInput } from "@/lib/validation/meetingRequest";

// Emails the owner on a new meeting request, via Resend. No-ops if RESEND_API_KEY isn't set -- the
// request is already saved to Supabase either way. Call from inside after() so it runs post-response.
export async function sendMeetingRequestEmail(input: MeetingRequestInput, toEmail: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !toEmail) return;

  const from = process.env.RESEND_FROM_EMAIL || "Portfolio <onboarding@resend.dev>";
  const text = [
    `Name: ${input.name}`,
    `Position: ${input.position}`,
    `Company: ${input.company}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    input.message ? `Message: ${input.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        // Lets you just hit "Reply" in your email client to respond straight to the
        // requester, instead of copying their address out of the message body.
        reply_to: input.email,
        subject: `New meeting request from ${input.name} (${input.company})`,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("meeting-request email failed:", res.status, body);
    }
  } catch (e) {
    console.error("meeting-request email failed:", e instanceof Error ? e.message : e);
  }
}
