"use server";

import { syncChatbotNow, type SyncResult } from "@/lib/chatbot-sync";

export type SyncState = SyncResult | undefined;

export async function syncChatbot(): Promise<SyncState> {
  return syncChatbotNow();
}
