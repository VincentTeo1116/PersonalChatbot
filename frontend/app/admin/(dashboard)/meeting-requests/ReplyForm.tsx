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
        className="admin-input"
      />
      {state?.ok === false && <p className="text-xs text-red-500">{state.error}</p>}
      <button type="submit" disabled={pending} className="admin-btn admin-btn-primary px-4 py-1.5 text-xs">
        {pending ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}
