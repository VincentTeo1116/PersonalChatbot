import Link from "next/link";
import ContentShell from "@/components/ContentShell";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";
import EvaluationTryQuestions from "@/components/EvaluationTryQuestions";
import { evaluationReport as report } from "@/lib/evaluation-report";
import { getProfile } from "@/lib/data";
import { contentMetadata } from "@/lib/seo";

export const metadata = contentMetadata(
  "AI Evaluation Lab: Testing a Portfolio RAG Assistant | Vincent Teo",
  "Try Vincent Teo's RAG portfolio assistant and inspect a dated retrieval evaluation, its ranking miss, and the limits of the 20-question test.",
  "/ai-lab",
);

export default async function AiLabPage() {
  const profile = await getProfile();
  return (
    <ContentShell eyebrow="AI evaluation lab" title="Test the assistant. Inspect the evidence." intro="A transparent look at what the portfolio assistant retrieves, how quickly it answers, and what the current test can—and cannot—prove.">
      <ChatWidgetLoader profile={profile} />

      <section aria-labelledby="try-heading" className="mt-12 rounded-3xl border border-indigo-400/30 bg-indigo-500/5 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Try it yourself</p>
        <h2 id="try-heading" className="mt-2 text-2xl font-semibold text-foreground">Choose a question, then inspect the answer</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">A question opens in the existing chat for you to review and send. After the reply, open <strong>Inspect answer</strong> to see the selected portfolio entries and server time. The source similarity number measures relatedness, not certainty.</p>
        <EvaluationTryQuestions />
      </section>

      <section aria-labelledby="results-heading" className="mt-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Measured {report.date}</p>
        <h2 id="results-heading" className="mt-2 text-2xl font-semibold text-foreground">Retrieval test results</h2>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">A fixed set of {report.questions} portfolio questions was run against the <code>{report.namespace}</code> knowledge index. The test asks where an expected entry appears among the first {report.retrievalDepth} matches.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            { value: `${report.hitAtOne}/${report.questions}`, label: "Hit@1", detail: "Expected entry appeared first." },
            { value: `${report.hitAtThree}/${report.questions}`, label: "Hit@3", detail: "Expected entry appeared in the first three." },
            { value: report.mrr.toFixed(3), label: "Mean reciprocal rank", detail: "Average of 1 ÷ the expected entry's rank." },
          ].map(({ value, label, detail }) => (
            <div key={label} className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-3xl font-bold text-foreground">{value}</p>
              <h3 className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">{label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-text-muted">Run: Gemini <code>{report.embeddingModel}</code>, {report.retrievalDepth} results per question, owner-name stripping enabled. This is a dated snapshot, not a score that updates with every content edit. These are retrieval scores before the chat route&apos;s {report.productionCutoff} similarity cutoff; they do not measure final answer accuracy.</p>
      </section>

      <section aria-labelledby="miss-heading" className="mt-16 rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-300">A real ranking miss</p>
        <h2 id="miss-heading" className="mt-2 text-2xl font-semibold text-foreground">“{report.reviewedCase.question}”</h2>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <p className="rounded-xl bg-background p-4 text-text-secondary"><strong className="block text-foreground">Rank 1</strong>{report.reviewedCase.first}</p>
          <p className="rounded-xl bg-background p-4 text-text-secondary"><strong className="block text-foreground">Expected entry · rank {report.reviewedCase.expectedRank}</strong>{report.reviewedCase.expected}</p>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-text-secondary">{report.reviewedCase.finding}</p>
      </section>

      <section aria-labelledby="limits-heading" className="mt-16">
        <h2 id="limits-heading" className="text-2xl font-semibold text-foreground">What the test does not establish</h2>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-text-secondary">
          <li className="rounded-xl border border-border p-4"><strong className="text-foreground">Answer quality:</strong> a relevant source can still produce an unsupported or incomplete answer. The awards answer was reviewed separately; the other 19 answers were not scored here.</li>
          <li className="rounded-xl border border-border p-4"><strong className="text-foreground">Live threshold:</strong> the test ranks six raw matches before the production similarity cutoff. A hit here may not appear in a live response.</li>
          <li className="rounded-xl border border-border p-4"><strong className="text-foreground">Coverage:</strong> substring checks can count a broad Skills entry even if it omits the exact skill asked about. Unanswerable and paraphrased questions need a separate, reviewed test set.</li>
        </ul>
        <p className="mt-6 text-sm text-text-secondary">For implementation details, read <Link href="/writing/evaluating-portfolio-rag-retrieval" className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300">how I evaluate retrieval</Link> and the <Link href="/projects/portfolio-chatbot" className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300">RAG portfolio case study</Link>.</p>
      </section>
    </ContentShell>
  );
}
