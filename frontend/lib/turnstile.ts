import "server-only";

// Cloudflare Turnstile is optional: with TURNSTILE_SECRET_KEY unset nothing is checked, so the site works before the keys exist. Once it is set, every protected form must carry a valid token.
export function turnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await res.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    // Fail closed: if the check can't run, don't let the submission through.
    return false;
  }
}
