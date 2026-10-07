import "server-only";
import { after } from "next/server";

export type SyncResult =
  | { ok: true; upserted: number; removed: number; skipped: number }
  | { ok: false; error: string };

/** Tells the chatbot backend to re-read Supabase and re-embed everything into Pinecone. */
export async function syncChatbotNow(): Promise<SyncResult> {
  const url = process.env.CHATBOT_SYNC_URL;
  const secret = process.env.CHATBOT_SYNC_SECRET;
  if (!url || !secret) {
    return { ok: false, error: "CHATBOT_SYNC_URL and CHATBOT_SYNC_SECRET are not set in .env.local" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "X-Sync-Secret": secret },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: typeof body.detail === "string" ? body.detail : `Backend returned HTTP ${res.status}` };
    }
    return { ok: true, upserted: body.upserted ?? 0, removed: body.removed ?? 0, skipped: body.skipped ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach the chatbot backend" };
  }
}

// Runs after the response is sent, so a slow/offline backend never delays or fails the admin save itself.
export function queueChatbotSync() {
  if (!process.env.CHATBOT_SYNC_URL) return;
  after(async () => {
    const result = await syncChatbotNow();
    if (!result.ok) console.error("[chatbot-sync] failed:", result.error);
  });
}
