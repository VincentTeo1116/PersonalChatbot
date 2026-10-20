import "server-only";
import type { MeetingRequestInput } from "@/lib/validation/meetingRequest";

// Emails the owner on a new meeting request, via Resend. No-ops if RESEND_API_KEY isn't set -- the request is already saved to Supabase either way. Call from inside after() so it runs post-response.
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
        // Lets you just hit "Reply" in your email client to respond straight to the requester, instead of copying their address out of the message body.
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

export type EmailResult = { sent: true } | { sent: false; error: string };

// Sends the admin's reply to a meeting request, via Resend. Unlike the notification above (fire-and-forget, called from inside after()), this one's result is shown to the admin directly -- replyToMeetingRequest() only marks the request "replied" if this reports sent.
export async function sendMeetingReplyEmail(input: {
  to: string;
  requesterName: string;
  replyMessage: string;
  ownerEmail: string;
  ownerName: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, error: "Email isn't configured yet -- set RESEND_API_KEY in .env.local." };
  }

  const from = process.env.RESEND_FROM_EMAIL || "Portfolio <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        // So hitting "Reply" in their inbox goes straight to the owner, not the sending address.
        reply_to: input.ownerEmail,
        subject: `Re: your meeting request with ${input.ownerName}`,
        text: `Hi ${input.requesterName},\n\n${input.replyMessage}\n\n— ${input.ownerName}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, error: `Resend returned HTTP ${res.status}: ${body.slice(0, 300)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "Unknown error sending email." };
  }
}
