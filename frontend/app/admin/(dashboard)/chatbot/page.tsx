import Link from "next/link";
import { getChatLogs, getChatLogStats } from "@/lib/data";
import SyncForm from "./SyncForm";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ChatbotAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const onlyUnmatched = filter === "unmatched";

  const [logs, stats] = await Promise.all([
    getChatLogs(50, onlyUnmatched ? "unmatched" : undefined),
    getChatLogStats(),
  ]);

  return (
    <div className="max-w-2xl space-y-10">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Chatbot knowledge</h1>
        <p className="text-sm text-text-secondary">
          The chatbot answers from the same Supabase content you edit here — profile, education,
          experience, projects, and research. Saving any of those re-syncs it automatically in the
          background. If a background sync ever fails (e.g. the backend was offline), use this to
          re-sync manually.
        </p>
        <SyncForm />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Recent questions</h2>
        <p className="text-sm text-text-secondary">
          What visitors have actually asked, most recent first — a good source of ideas for what
          content to add. &quot;No match&quot; means no knowledge-base entry scored high enough to
          answer confidently; those are the clearest signal of a content gap.
        </p>

        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/chatbot"
            className={`rounded-full px-3 py-1 ${!onlyUnmatched ? "bg-indigo-500 text-white" : "border border-border text-text-secondary hover:text-foreground"}`}
          >
            All ({stats.total})
          </Link>
          <Link
            href="/admin/chatbot?filter=unmatched"
            className={`rounded-full px-3 py-1 ${onlyUnmatched ? "bg-indigo-500 text-white" : "border border-border text-text-secondary hover:text-foreground"}`}
          >
            Unanswered ({stats.unmatched})
          </Link>
        </div>

        {logs.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-subtle">
            {onlyUnmatched
              ? "No unanswered questions — every logged question matched something in the knowledge base."
              : <>
                  No questions logged yet. If visitors have already been chatting, make sure{" "}
                  <code className="rounded bg-surface-hover px-1 py-0.5">supabase/004_chat_logs.sql</code>{" "}
                  has been run in the Supabase SQL editor.
                </>}
          </p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className={`rounded-xl border bg-surface p-4 ${log.matched ? "border-border" : "border-l-4 border-l-amber-500 border-y-border border-r-border"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{log.question}</p>
                  <span className="shrink-0 text-xs text-text-subtle">{formatTime(log.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-text-muted">{log.answer}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-subtle">
                  <span>{log.matched ? `Matched (score ${log.topScore?.toFixed(2) ?? "—"})` : "No match"}</span>
                  {log.cacheHit && <span>Cached</span>}
                  {log.latencyMs != null && <span>{log.latencyMs}ms</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
