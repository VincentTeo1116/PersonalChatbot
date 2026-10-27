// Manually reviewed snapshot from `python -m scripts.eval_retrieval` on 2026-10-27.
// This measures retrieval rank before the chat route's similarity cutoff, not answer accuracy.
export const evaluationReport = {
  date: "2026-10-27",
  questions: 20,
  hitAtOne: 19,
  hitAtThree: 20,
  mrr: 0.975,
  retrievalDepth: 6,
  namespace: "portfolio-kb",
  embeddingModel: "gemini-embedding-001",
  productionCutoff: 0.58,
  reviewedCase: {
    question: "What awards has Vincent won?",
    expected: "SecInsight AI",
    first: "Hackathons",
    expectedRank: 2,
    finding: "The general Hackathons entry ranked above the more specific SecInsight AI entry. That is a miss for the test's strict first-result label check. In a separate manual answer review, the assistant still named the recorded third-place award correctly. This is a ranking weakness, not a verified wrong final answer.",
  },
  tryQuestions: [
    { label: "Awards", question: "What awards has Vincent won?", kind: "ranking" },
    { label: "Research", question: "Has Vincent published any research?", kind: "retrieval" },
    { label: "Project", question: "Tell me about APMoodle", kind: "retrieval" },
    { label: "Boundary check", question: "What is Vincent's PhD thesis about?", kind: "unmeasured" },
  ],
} as const;
