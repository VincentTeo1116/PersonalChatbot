import Link from "next/link";
import ContentShell from "@/components/ContentShell";
import ChatWidgetLoader from "@/components/ChatWidgetLoader";
import EvaluationHistory from "@/components/EvaluationHistory";
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

      <EvaluationHistory />

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
          <li className="rounded-xl border border-border p-4"><strong className="text-foreground">Answer quality:</strong> answers are checked with string rules for a subset of the questions, not read by a person. A passing answer contains the expected facts; it can still include an unsupported sentence the rules do not look for.</li>
          <li className="rounded-xl border border-border p-4"><strong className="text-foreground">Live threshold:</strong> retrieval is ranked over six raw matches, and separately checked against the production cutoff and result count. The live site also caches answers and adds a meeting-intent check that this test skips.</li>
          <li className="rounded-xl border border-border p-4"><strong className="text-foreground">Coverage:</strong> the questions were written by the same person who built the system, so they share its blind spots. Substring checks can also count a broad Skills entry even when it omits the exact skill asked about.</li>
        </ul>
        <p className="mt-6 text-sm text-text-secondary">For implementation details, read <Link href="/writing/evaluating-portfolio-rag-retrieval" className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300">how I evaluate retrieval</Link> and the <Link href="/projects/portfolio-chatbot" className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300">RAG portfolio case study</Link>.</p>
      </section>
    </ContentShell>
  );
}
