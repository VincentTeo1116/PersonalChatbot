export type Project = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  image: string;
  links: { label: string; url: string }[];
  featured?: boolean;
};

// The first two entries below are real, already-built projects (this chatbot
// backend and its sibling Companies Act chatbot) — filled in from what's known
// about them. Update the links once each is live. Add/replace the rest with
// your own projects; anything in [brackets] is a placeholder.
export const projects: Project[] = [
  {
    slug: "portfolio-chatbot",
    title: "Portfolio AI Chatbot",
    description:
      "The assistant on this very site. A retrieval-augmented chatbot that answers questions " +
      "about my background, skills, and projects — backed by Gemini embeddings + generation " +
      "and a Pinecone vector index. The knowledge base is a Google Sheet that auto-syncs to " +
      "Pinecone on every edit via an Apps Script webhook, so updating my info is a spreadsheet " +
      "edit, not a redeploy.",
    tags: ["FastAPI", "Gemini", "Pinecone", "RAG", "Next.js"],
    image: "/projects/portfolio-chatbot.svg",
    links: [
      { label: "GitHub", url: "https://github.com/[yourusername]/portfolio-chatbot-backend" },
    ],
    featured: true,
  },
  {
    slug: "companies-act-chatbot",
    title: "Companies Act 2016 AI Assistant",
    description:
      "A Malaysian legal-domain RAG chatbot answering questions on the Companies Act 2016. " +
      "Node-based workflow architecture: multi-namespace concurrent retrieval, cross-encoder " +
      "reranking, hierarchical context assembly, and Gemini generation, with a full FastAPI " +
      "backend, response caching, and circuit-breaker protection on AI calls. Deployed to " +
      "production behind a Cloudflare Tunnel.",
    tags: ["FastAPI", "Pinecone", "RAG", "Reranking", "Firebase"],
    image: "/projects/companies-act-chatbot.svg",
    links: [
      { label: "Live site", url: "https://cca.yyc.my" },
    ],
    featured: true,
  },
  {
    slug: "project-3",
    title: "[Your Project Name]",
    description:
      "[One or two sentences: the problem it solves, your role, and the outcome. Be specific " +
      "— a measurable result ('cut processing time by 40%', 'used by 200+ students') is far " +
      "stronger than a feature list.]",
    tags: ["[Tech 1]", "[Tech 2]", "[Tech 3]"],
    image: "/projects/placeholder.svg",
    links: [
      { label: "GitHub", url: "https://github.com/[yourusername]/[repo]" },
      { label: "Live demo", url: "[url or remove this link]" },
    ],
  },
];
