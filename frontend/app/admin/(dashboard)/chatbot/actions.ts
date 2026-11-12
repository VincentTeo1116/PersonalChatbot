"use server";

import { syncChatbotNow, type SyncResult } from "@/lib/chatbot-sync";
import { requireAdmin } from "@/lib/auth";

export type SyncState = SyncResult | undefined;

export async function syncChatbot(): Promise<SyncState> {
  await requireAdmin();
  return syncChatbotNow();
}
