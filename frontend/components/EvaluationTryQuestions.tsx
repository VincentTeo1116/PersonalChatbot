"use client";

import { useEffect, useState } from "react";
import { evaluationReport } from "@/lib/evaluation-report";

type ChatWidget = { prefillQuestion?: (question: string) => void };

function getWidget(): ChatWidget | undefined {
  return (window as Window & { portfolioChatbot?: ChatWidget }).portfolioChatbot;
}

export default function EvaluationTryQuestions() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => setReady(typeof getWidget()?.prefillQuestion === "function");
    update();
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      {evaluationReport.tryQuestions.map(({ label, question, kind }) => (
        <button
          key={question}
          type="button"
          data-lab-question
          disabled={!ready}
          onClick={() => getWidget()?.prefillQuestion?.(question)}
          className="group flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-indigo-400/60 hover:bg-indigo-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-wait disabled:opacity-60"
        >
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 transition-transform motion-safe:group-hover:-rotate-6 motion-safe:group-hover:-translate-y-0.5 dark:text-indigo-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v10a2.5 2.5 0 0 1-2.5 2.5H9l-5 3v-3.5A2.5 2.5 0 0 1 4 15.5z" /><path d="M8 9h8M8 12.5h5" /></svg>
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{label}</span>
            <span className="mt-1 block text-sm font-medium leading-snug text-foreground">{question}</span>
            <span className="mt-1 block text-xs text-text-muted">{kind === "unmeasured" ? "Unmeasured boundary check" : "From the retrieval test"} · {ready ? "Open in chat" : "Loading chat…"}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
