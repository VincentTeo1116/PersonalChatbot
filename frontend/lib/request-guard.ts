import "server-only";
import { headers } from "next/headers";
import { rateLimited } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export async function clientIp(): Promise<string> {
  const h = await headers();
  // Vercel sets these itself, so a caller can't spoof them there.
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// True when this visitor has used up their allowance for `name`.
export async function tooManyRequests(name: string, max: number, windowMs: number): Promise<boolean> {
  return rateLimited(`${name}:${await clientIp()}`, max, windowMs);
}

export const RATE_LIMIT_MESSAGE = "You've sent a few of these already. Please wait a little before trying again.";
export const HUMAN_CHECK_MESSAGE = "We couldn't confirm you're human. Please refresh the page and try again.";

// Checked only after the fields validate, because a Turnstile token works once and a typo shouldn't burn it.
export async function passesHumanCheck(formData: FormData): Promise<boolean> {
  return verifyTurnstile(String(formData.get("cf-turnstile-response") ?? ""), await clientIp());
}
