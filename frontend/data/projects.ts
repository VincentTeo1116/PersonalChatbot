export type Project = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  image: string;
  /** Extra screenshots shown in the preview modal. Falls back to `image` if omitted. */
  screenshots?: string[];
  /** Optional demo video (mp4 or YouTube/embeds URL) shown in the preview modal. */
  demoVideoUrl?: string;
  links: { label: string; url: string }[];
  featured?: boolean;
  /** Short award/result badge, e.g. "3rd Place". */
  award?: string;
};

// The first entry below is real (this portfolio chatbot itself). The LMS entry
// is a placeholder waiting on details you're providing. Add/replace the rest
// with your own projects; anything in [brackets] is a placeholder.
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
    slug: "apmoodle-lms",
    title: "APMoodle",
    description:
      "A full-stack learning management system built with a team of five — modules, materials, " +
      "quizzes, and real-time progress in one calm, fast platform. Students get a live dashboard " +
      "(average/best scores, quiz history, trends), auto-graded multiple-choice quizzes, one-code " +
      "module enrolment, and real-time announcements/chat with lecturers, complete with unread " +
      "notification dots. I designed the Supabase (PostgreSQL) schema, built the ASP.NET backend " +
      "and React frontend, implemented the real-time student–lecturer chat (polling every 5s), and " +
      "wired up SMTP email for registration and password resets. Scored a 4.0.",
    tags: ["ASP.NET", "Supabase", "PostgreSQL", "React", "Tailwind CSS", "SMTP"],
    image: "/projects/placeholder.svg",
    links: [{ label: "Live site", url: "https://apmoodle.onrender.com/" }],
    featured: true,
  },
  {
    slug: "abang-karipap",
    title: "ABANG KARIPAP",
    description:
      "An AI-powered fake news detector built at KitaHack. Users paste text or upload an image " +
      "and get a misinformation verdict with a confidence score and a plain-English explanation, " +
      "powered by Google Gemini and the Google Vision API. React frontend, FastAPI backend, with " +
      "optional sign-in and Firebase-backed history so you can revisit past checks.",
    tags: ["React", "FastAPI", "Gemini", "Google Vision API", "Firebase"],
    image: "/projects/placeholder.svg",
    links: [{ label: "Live demo", url: "https://karipapfakenews.netlify.app/" }],
  },
  {
    slug: "secinsight-ai",
    title: "SecInsight AI",
    description:
      "Built at the GTD x APU Hackathon (by Maybank), where it placed 3rd. SecInsight AI analyzes " +
      "CVE CSV data and automatically generates plain-English vulnerability summaries, risk scores, " +
      "priority levels, and remediation guidance using Google Gemini AI — turning raw vulnerability " +
      "dumps into something a non-security team can act on.",
    tags: ["Google Gemini", "CVE Data Analysis"],
    image: "/projects/placeholder.svg",
    links: [],
    award: "3rd Place — GTD x APU Hackathon",
  },
  {
    slug: "foodloop",
    title: "FoodLoop",
    description:
      "Built at UM Hackathon. An AI-powered food redistribution platform using Z.AI GLM for " +
      "intelligent donation matching — parsing unstructured donation descriptions, orchestrating a " +
      "multi-step workflow, and automatically ranking NGOs by food type and distance. Session-based " +
      "conversation handling on PostgreSQL, containerized with Docker, complete donation tracking " +
      "from listing to pickup confirmation.",
    tags: ["Z.AI GLM", "PostgreSQL", "Docker", "HTML/CSS"],
    image: "/projects/placeholder.svg",
    links: [],
  },
  {
    slug: "care-ai",
    title: "Care AI",
    description:
      "Built at the AWS CendekiAwan Hackathon. An AI-powered medical report interpretation platform " +
      "that analyzes medical documents and transforms complex clinical terminology into plain-language " +
      "explanations, risk insights, and personalized health recommendations using AWS PartyRock and " +
      "LLM integration.",
    tags: ["AWS PartyRock", "LLM Integration", "Medical NLP"],
    image: "/projects/placeholder.svg",
    links: [],
  },
];
