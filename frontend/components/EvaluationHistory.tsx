import history from "@/lib/evaluation-history.json";

// Each entry is one run of portfolio-chatbot-backend/scripts/eval_chatbot.py --save (older runs measured less, so most fields can be null).
type Run = {
  date: string;
  commit: string | null;
  cutoff: number;
  topK: number;
  depth: number;
  questions: number;
  retrieval: {
    questions: number;
    hitAtOne: number;
    hitAtThree: number;
    mrr: number;
    live: number | null;
    byKind: Record<string, { questions: number; hitAtOne: number; hitAtThree: number }>;
  };
  outOfScope: { questions: number; blockedByCutoff: number } | null;
  smallTalk: { greetings: number; recognised: number; falsePositives: number } | null;
  answers: {
    factual: { questions: number; passed: number };
    declines: { questions: number; passed: number; byKind: Record<string, { questions: number; passed: number }> };
    numbersTraceable: number;
    answered: number;
    medianSeconds: number;
    p95Seconds: number;
    model: string;
  } | null;
};

const KIND_LABELS: Record<string, string> = {
  direct: "Direct questions",
  paraphrase: "Paraphrased questions",
  multi: "Multi-part questions",
  unanswerable: "Not in the portfolio",
  off_topic: "Off-topic",
  adversarial: "Misuse attempts",
};

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function Stat({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <h3 className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">{label}</h3>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary">{detail}</p>
    </div>
  );
}

function Bar({ label, part, whole }: { label: string; part: number; whole: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="tabular-nums font-medium text-foreground">
          {part}/{whole}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover" aria-hidden>
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${percent(part, whole)}%` }} />
      </div>
    </div>
  );
}

/** Latest evaluation run plus the run history, read from a JSON file the evaluation script appends to. */
export default function EvaluationHistory() {
  const runs = history as Run[];
  const latest = runs[runs.length - 1];
  if (!latest) return null;
  const { retrieval, answers, outOfScope, smallTalk } = latest;

  return (
    <section aria-labelledby="results-heading" className="mt-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Measured {latest.date}</p>
      <h2 id="results-heading" className="mt-2 text-2xl font-semibold text-foreground">Evaluation results</h2>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        A fixed set of {latest.questions} hand-written questions is run against the live knowledge index: {retrieval.questions} the portfolio can
        answer{outOfScope ? `, and ${outOfScope.questions} it should decline (missing facts, off-topic requests and misuse attempts)` : ""}. The same
        script runs before retrieval or prompt changes, so a change that makes answers worse shows up as a lower number here.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Stat value={`${retrieval.hitAtOne}/${retrieval.questions}`} label="Right entry ranked first" detail="Hit@1: the expected portfolio entry was the top search result." />
        <Stat value={`${retrieval.hitAtThree}/${retrieval.questions}`} label="Right entry in the top three" detail={`Hit@3 over ${latest.depth} results per question. Mean reciprocal rank ${retrieval.mrr.toFixed(3)}.`} />
        {retrieval.live !== null && (
          <Stat value={`${retrieval.live}/${retrieval.questions}`} label="Reaches the model" detail={`The expected entry is in the top ${latest.topK} and above the ${latest.cutoff} similarity cutoff used in production.`} />
        )}
        {answers && (
          <>
            <Stat value={`${answers.factual.passed}/${answers.factual.questions}`} label="Answers contain the expected facts" detail="Generated answers checked for the facts recorded for that question." />
            <Stat value={`${answers.declines.passed}/${answers.declines.questions}`} label="Correctly declined" detail="Questions the portfolio cannot answer, where the assistant said so and leaked nothing." />
            <Stat value={`${answers.medianSeconds.toFixed(1)} s`} label="Median generation time" detail={`95th percentile ${answers.p95Seconds.toFixed(1)} s, measured from the evaluation machine. Model: ${answers.model}.`} />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {Object.keys(retrieval.byKind).length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Retrieval, ranked first, by question type</h3>
            {Object.entries(retrieval.byKind).map(([kind, r]) => (
              <Bar key={kind} label={KIND_LABELS[kind] ?? kind} part={r.hitAtOne} whole={r.questions} />
            ))}
          </div>
        )}
        {answers && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Declined correctly, by question type</h3>
            {Object.entries(answers.declines.byKind).map(([kind, r]) => (
              <Bar key={kind} label={KIND_LABELS[kind] ?? kind} part={r.passed} whole={r.questions} />
            ))}
            <Bar label="Numbers traceable to a source" part={answers.numbersTraceable} whole={answers.answered} />
          </div>
        )}
      </div>

      {(outOfScope || smallTalk) && (
        <ul className="mt-8 space-y-2 text-sm leading-relaxed text-text-secondary">
          {outOfScope && (
            <li>
              <strong className="text-foreground">The similarity cutoff alone is a weak filter:</strong> it blocked {outOfScope.blockedByCutoff} of{" "}
              {outOfScope.questions} questions the portfolio cannot answer. The rest reach the model with loosely related context, so declining them
              depends on the prompt, which is what the &ldquo;correctly declined&rdquo; figure measures.
            </li>
          )}
          {smallTalk && (
            <li>
              <strong className="text-foreground">Greetings:</strong> {smallTalk.recognised} of {smallTalk.greetings} greeting messages were answered
              from a template with no model call, and {smallTalk.falsePositives} of the {latest.questions} real questions were mistaken for one.
            </li>
          )}
        </ul>
      )}

      {runs.length > 1 && (
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-foreground">Run history</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Questions</th>
                  <th className="py-2 pr-4 font-medium">Ranked first</th>
                  <th className="py-2 pr-4 font-medium">Top three</th>
                  <th className="py-2 pr-4 font-medium">Facts</th>
                  <th className="py-2 font-medium">Declines</th>
                </tr>
              </thead>
              <tbody className="tabular-nums text-text-secondary">
                {[...runs].reverse().map((run, index) => (
                  <tr key={`${run.date}-${index}`} className="border-t border-border">
                    <td className="py-2 pr-4 text-foreground">{run.date}</td>
                    <td className="py-2 pr-4">{run.questions}</td>
                    <td className="py-2 pr-4">{percent(run.retrieval.hitAtOne, run.retrieval.questions)}%</td>
                    <td className="py-2 pr-4">{percent(run.retrieval.hitAtThree, run.retrieval.questions)}%</td>
                    <td className="py-2 pr-4">{run.answers ? `${run.answers.factual.passed}/${run.answers.factual.questions}` : "not measured"}</td>
                    <td className="py-2">{run.answers ? `${run.answers.declines.passed}/${run.answers.declines.questions}` : "not measured"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            Runs use different question sets as the test grows, so compare percentages with care: the first run had 20 questions and measured retrieval
            only.
          </p>
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-text-muted">
        How answers are checked: string checks, not a human or model judge. An answer passes when it contains the facts recorded for that question, or,
        for questions it should decline, when it says it cannot help and contains none of the forbidden phrases. This is repeatable and cheap, but it
        cannot judge tone or catch every unsupported claim.
      </p>
    </section>
  );
}
