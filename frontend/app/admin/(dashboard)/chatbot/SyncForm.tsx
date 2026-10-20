"use client";

import { useActionState } from "react";
import { syncChatbot, type SyncState } from "./actions";
import { useAdminFeedback } from "@/components/admin/AdminFeedback";

export default function SyncForm() {
  const { showSuccess, showError } = useAdminFeedback();
  const [state, action, pending] = useActionState<SyncState>(async () => {
    const result = await syncChatbot();
    if (result?.ok) {
      showSuccess({ title: "Chatbot synced", detail: `${result.upserted} updated, ${result.removed} removed, ${result.skipped} skipped.` });
    } else if (result) {
      showError(result.error, "Sync failed");
    }
    return result;
  }, undefined);

  return (
    <form action={action} className="space-y-4">
      <button type="submit" disabled={pending} className="admin-btn admin-btn-primary">
        {pending ? "Syncing… (can take ~10s)" : "Sync chatbot now"}
      </button>

      {state?.ok === true && (
        <p className="text-sm text-emerald-500">
          Synced: {state.upserted} entries updated, {state.removed} removed, {state.skipped} skipped.
        </p>
      )}
      {state?.ok === false && <p className="text-sm text-red-500">Sync failed: {state.error}</p>}
    </form>
  );
}
