import Link from "next/link";
import { getChatFeedback, getChatFeedbackCounts, getChatLogs, getChatLogStats } from "@/lib/data";
import PageHeader from "@/components/admin/PageHeader";
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

  const [logs, stats, feedback, feedbackCounts] = await Promise.all([
    getChatLogs(50, onlyUnmatched ? "unmatched" : undefined),
    getChatLogStats(),
    getChatFeedback(),
    getChatFeedbackCounts(),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <PageHeader eyebrow="Chatbot" title="Chatbot knowledge" />
        <div className="admin-card space-y-4 p-6">
          <p className="text-sm text-text-secondary">
            The chatbot answers from the same Supabase content you edit here — profile, education,
            experience, projects, and research. Saving any of those re-syncs it automatically in the
            background. If a background sync ever fails (e.g. the backend was offline), use this to
            re-sync manually.
          </p>
          <SyncForm />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Answer feedback</h2>
        <p className="text-sm text-text-secondary">
          Thumbs up/down from visitors, newest first. A 👎 usually means a content gap or a poorly
          matched entry — check the question and add or reword the relevant section.{" "}
          <span className="font-medium text-foreground">
            👍 {feedbackCounts.up} · 👎 {feedbackCounts.down}
          </span>
        </p>
        {feedback.length === 0 ? (
          <p className="admin-card p-4 text-sm text-text-subtle">No feedback yet.</p>
        ) : (
          <ul className="space-y-2">
            {feedback.map((f) => (
              <li
                key={f.id}
                className={`admin-card p-4 ${f.rating === "down" ? "border-l-4 border-l-red-500" : "border-l-4 border-l-emerald-500"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {f.rating === "down" ? "👎" : "👍"} {f.question}
                  </p>
                  <span className="shrink-0 text-xs text-text-subtle">{formatTime(f.createdAt)}</span>
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-text-muted">{f.answer}</p>
                {!f.matched && <p className="mt-2 text-xs text-text-subtle">No knowledge-base match</p>}
              </li>
            ))}
          </ul>
        )}
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
            className={`admin-btn px-3 py-1 text-xs ${!onlyUnmatched ? "admin-btn-primary" : "admin-btn-ghost"}`}
          >
            All ({stats.total})
          </Link>
          <Link
            href="/admin/chatbot?filter=unmatched"
            className={`admin-btn px-3 py-1 text-xs ${onlyUnmatched ? "admin-btn-primary" : "admin-btn-ghost"}`}
          >
            Unanswered ({stats.unmatched})
          </Link>
        </div>

        {logs.length === 0 ? (
          <p className="admin-card p-4 text-sm text-text-subtle">
            {onlyUnmatched
              ? "No unanswered questions — every logged question matched something in the knowledge base."
              : "No questions logged yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className={`admin-card p-4 ${log.matched ? "" : "border-l-4 border-l-amber-500"}`}
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
