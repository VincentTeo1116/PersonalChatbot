export type EngineeringArticle = {
  slug: string;
  title: string;
  description: string;
  published: string;
  updated: string;
  sections: { id: string; title: string; paragraphs: string[] }[];
};

// Original implementation notes. Update the dates when the text materially changes.
// Results are deliberately described only when measurements are available.
export const articles: EngineeringArticle[] = [
  {
    slug: "supabase-rag-knowledge-sync",
    title: "Keeping a RAG portfolio assistant in sync with Supabase",
    description: "How this portfolio connects Supabase, Gemini embeddings, Pinecone, and Groq, including content updates, stale vectors, and cache limitations.",
    published: "2026-10-26",
    updated: "2026-10-26",
    sections: [
      { id: "shared-content", title: "Start with the same content source", paragraphs: [
        "This portfolio has two ways to explore the same background: a website and an AI assistant. Maintaining a separate copy of the content for each creates a freshness problem. A project can appear on the website while the assistant continues to answer from an older description.",
        "The implementation reads the public portfolio tables in Supabase for both uses. Next.js renders the website from those records. A FastAPI service turns the records into question-and-answer entries for retrieval. The data includes the profile, education, work experience, projects, research, and final year project. Visitor messages and meeting requests are excluded from this knowledge base.",
      ] },
      { id: "update-flow", title: "What happens after an edit", paragraphs: [
        "After a successful project save, a Next.js server action schedules a sync with after(). The visitor-facing save response does not have to wait for embedding requests. The backend webhook checks a shared secret before reading the content tables and generating new vectors.",
        "Each knowledge entry has an ID derived from its category and question. Editing the answer updates the existing vector. Renaming a project can change its generated question and therefore its ID. The sync removes IDs absent from the new content set, so deleted or renamed entries do not remain indefinitely in retrieval results.",
        "The route refuses to sync an empty content set, and a failed Supabase read aborts before cleanup. These checks matter because deleting every vector after a failed read would turn a temporary content error into an empty knowledge base.",
      ] },
      { id: "retrieval", title: "Keep the retrieval units useful", paragraphs: [
        "Short portfolio entries are embedded as complete records using Gemini. Longer case studies are separated into their named sections, each carrying a link to the corresponding heading. That gives a question about limitations a more specific source than one vector representing the entire project.",
        "At question time, the backend embeds the query, asks Pinecone for nearby entries, applies a similarity threshold, and sends the retrieved context to Groq. The widget streams the answer and displays supporting links. A source link helps a visitor inspect the evidence; it does not prove that every generated claim is supported.",
      ] },
      { id: "tradeoffs", title: "Tradeoffs I would measure next", paragraphs: [
        "The current sync re-embeds the content on each run. This is easy to follow for a small portfolio, but a growing knowledge base would benefit from comparing content hashes and updating only changed entries. Concurrent sync jobs also deserve explicit coordination before scaling the service.",
        "Answers use an in-memory cache, which is cleared by the process handling a successful sync. A deployment with multiple workers would need shared invalidation or versioned cache keys to keep every worker current. The update process is also not a transactional switch between complete index versions; an interrupted sync can require a retry.",
        "The useful next measurements are sync duration, embedding requests per edit, retrieval quality after an update, and the time until changed content appears in an answer. These are proposed measurements, not published benchmark results.",
      ] },
    ],
  },
  {
    slug: "evaluating-portfolio-rag-retrieval",
    title: "Evaluating RAG retrieval with hit rate and reciprocal rank",
    description: "A practical explanation of this portfolio's 20-question retrieval check, what hit@1 and MRR measure, and why answer quality needs separate evaluation.",
    published: "2026-10-26",
    updated: "2026-10-26",
    sections: [
      { id: "questions", title: "Define what should be retrieved", paragraphs: [
        "The repository includes a retrieval evaluation script with 20 questions about awards, research, education, tools, work experience, and individual projects. Each question has an expected substring in a metadata field, such as a project name or the Research category.",
        "The script uses the same retrieval service as the chatbot and requests the six highest-ranked matches. It then finds the first result whose selected metadata field contains the expected substring. This makes the check reproducible, while keeping the expected answers understandable enough to inspect manually.",
      ] },
      { id: "metrics", title: "Read the three reported metrics", paragraphs: [
        "Hit@1 counts questions for which the expected entry appears first. Hit@3 counts those where it appears within the first three results. Mean reciprocal rank averages one divided by the rank of the first expected match; a question without a match contributes zero. For example, an expected entry at rank two contributes 0.5 to that question's reciprocal rank.",
        "These measures answer different practical questions. Hit@1 describes whether the best result is usually useful. Hit@3 describes whether relevant evidence is available near the top. Reciprocal rank distinguishes finding the expected entry immediately from finding it lower in the list.",
      ] },
      { id: "limitations", title: "Know what this check cannot establish", paragraphs: [
        "The script inspects retrieval before the chat route's similarity cutoff. It therefore does not measure whether the production route would retain each expected match. A useful follow-up evaluation would report both retrieval rank and the answerable-question rate after the configured cutoff.",
        "A category match can also be generous: a Skills entry may satisfy the label check while omitting the particular skill the question asks about. A stronger test set would identify the supporting fact or exact source, and would include questions that have no supported answer.",
        "Finally, relevant context can still lead to an incomplete or unsupported generated answer. Retrieval scores should be reported alongside a separate review of factual support, citation relevance, appropriate abstention, and the final answer's usefulness. The presence of a source is not a calibrated probability that the response is correct.",
      ] },
      { id: "experiments", title: "Make comparisons reproducible", paragraphs: [
        "To compare an embedding or preprocessing change, hold the questions and knowledge-base snapshot constant. Record the embedding model, namespace, retrieval depth, cutoff, and evaluation date. The existing script can compare query name stripping with raw queries, but the indexed document preprocessing must also be documented for that comparison to be interpretable.",
        "A future report should include individual failures and a separate held-out set of paraphrases. Questions about missing experience, ambiguous project references, and multilingual input are useful additions. Latency should be measured independently, with cached and uncached requests identified.",
        "This article explains the implemented evaluation method. A numerical benchmark has not been published here yet; any future score should be accompanied by its test set and configuration so readers can assess what it actually demonstrates.",
      ] },
    ],
  },
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
