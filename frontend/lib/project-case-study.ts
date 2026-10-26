export const CASE_STUDY_SECTIONS = [
  { key: "problem", title: "The problem", prompt: "Who needed this, and what made the problem worth solving?" },
  { key: "contribution", title: "My contribution", prompt: "Explain what you personally built and what your teammates handled." },
  { key: "approach", title: "How it works", prompt: "Walk through the architecture, data flow, and main implementation steps." },
  { key: "decisions", title: "Engineering decisions", prompt: "Explain the alternatives, tradeoffs, and reasons behind your choices." },
  { key: "validation", title: "Evidence and evaluation", prompt: "Include measured results, evaluation methods, or linked evidence. State when results have not been measured." },
  { key: "limitations", title: "Limitations and next steps", prompt: "Describe failure cases, constraints, and what you would improve next." },
] as const;

export type CaseStudyKey = (typeof CASE_STUDY_SECTIONS)[number]["key"];
export type ProjectCaseStudy = Partial<Record<CaseStudyKey, string>>;
export const CASE_STUDY_MAX_LENGTH = 6000;

/** Older databases and incomplete drafts remain valid; only known text fields are rendered. */
export function normalizeCaseStudy(value: unknown): ProjectCaseStudy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const result: ProjectCaseStudy = {};
  for (const { key } of CASE_STUDY_SECTIONS) {
    const text = record[key];
    if (typeof text === "string" && text.trim()) result[key] = text.trim();
  }
  return result;
}
