"use client";

import { useActionState } from "react";
import { syncChatbot, type SyncState } from "./actions";

export default function SyncForm() {
  const [state, action, pending] = useActionState<SyncState>(syncChatbot, undefined);

  return (
    <form action={action} className="space-y-4">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
      >
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
