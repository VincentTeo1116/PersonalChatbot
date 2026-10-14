"use client";

import { useActionState } from "react";
import { replyToMeetingRequest, type ReplyState } from "./actions";
import type { MeetingRequest } from "@/lib/types";

export default function ReplyForm({ request }: { request: MeetingRequest }) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToMeetingRequest, undefined);

  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={request.id} />
      <input type="hidden" name="requesterName" value={request.name} />
      <input type="hidden" name="requesterEmail" value={request.email} />
      <textarea
        name="replyMessage"
        rows={3}
        required
        placeholder={`Hi ${request.name}, ...`}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-indigo-400"
      />
      {state?.ok === false && <p className="text-xs text-red-500">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}
