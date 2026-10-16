import { getMeetingRequests } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
import { deleteMeetingRequest } from "./actions";
import ReplyForm from "./ReplyForm";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function MeetingRequestsPage() {
  const requests = await getMeetingRequests();

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow="Inbox"
        title="Meeting requests"
        description="Submissions from the &quot;Request a meeting&quot; button in Contact. Reply to them directly by email."
      />

      {requests.length === 0 ? (
        <p className="admin-card p-4 text-sm text-text-subtle">
          No requests yet. If people have already tried, make sure{" "}
          <code className="rounded bg-surface-hover px-1 py-0.5">supabase/007_meeting_requests.sql</code> has been run
          in the Supabase SQL editor.
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="admin-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{r.name}</p>
                    <span
                      className={`admin-badge ${
                        r.status === "replied"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {r.status === "replied" ? "Replied" : "Pending"}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {r.position} at {r.company}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-text-subtle">{formatTime(r.createdAt)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                <a href={`mailto:${r.email}`} className="hover:text-foreground hover:underline">{r.email}</a>
                <a href={`tel:${r.phone}`} className="hover:text-foreground hover:underline">{r.phone}</a>
              </div>
              {r.message && <p className="mt-2 text-sm text-text-secondary">{r.message}</p>}

              {r.status === "replied" ? (
                <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xs font-medium text-text-muted">
                    Your reply{r.repliedAt ? ` · ${formatTime(r.repliedAt)}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">{r.replyMessage}</p>
                </div>
              ) : (
                <ReplyForm request={r} />
              )}

              <form action={deleteMeetingRequest} className="mt-3">
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="admin-btn admin-btn-danger px-3 py-1 text-xs">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
