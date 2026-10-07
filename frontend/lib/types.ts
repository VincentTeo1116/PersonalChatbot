export type EducationImage = {
  src: string;
  caption: string;
};

export type EducationEntry = {
  id: string;
  degree: string;
  institution: string;
  period: string;
  detail: string;
  images: EducationImage[];
};

/** `level` is a 1-5 proficiency rating, shown as filled dots next to the skill name. */
export type SkillItem = {
  name: string;
  level: number;
};

export type SkillCategory = {
  category: string;
  items: SkillItem[];
};

export type Profile = {
  name: string;
  tagline: string;
  location: string;
  heroSummary: string;
  about: string;
  avatarUrl: string;
  education: EducationEntry[];
  skills: SkillCategory[];
  statCgpa: number | null;
  statHackathons: number | null;
  // Short "open to work" line shown near Contact, e.g. "Open to full-time roles from Aug 2026". Blank hides it.
  availability: string | null;
  contact: {
    email: string;
    github: string;
    linkedin: string;
    resumeUrl: string;
  };
};

export type WorkExperienceImage = {
  src: string;
  caption: string;
};

export type WorkExperience = {
  id: string;
  role: string;
  company: string;
  period: string;
  detail: string;
  logoUrl: string | null;
  images: WorkExperienceImage[];
};

export type ProjectLink = {
  label: string;
  url: string;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  image: string;
  /** Extra screenshots shown in the preview modal. Falls back to `image` if omitted. */
  screenshots?: string[];
  /** Optional demo video (mp4 or YouTube/embeds URL) shown in the preview modal. */
  demoVideoUrl?: string;
  links: ProjectLink[];
  featured?: boolean;
  /** Short award/result badge, e.g. "3rd Place". */
  award?: string;
  /** What you personally did, e.g. "Solo project" or "Led backend, teammate built frontend". */
  role?: string;
  /** A concrete outcome, e.g. "Cut manual grading time by ~60%, used by 50+ students". */
  impact?: string;
};

export type Publication = {
  id: string;
  slug: string;
  title: string;
  venue: string;
  authors: string[];
  supervisor: string;
  doi: string;
  doiUrl: string;
  description: string;
  image: string;
};

export type HackathonPhoto = {
  id: string;
  src: string;
  caption: string;
};

export type Testimonial = {
  id: string;
  authorName: string;
  authorRole: string;
  quote: string;
  avatarUrl: string | null;
};

// A "Request a meeting" form submission -- see supabase/007_meeting_requests.sql.
export type MeetingRequest = {
  id: string;
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
  message: string | null;
  createdAt: string;
};

export type FypImage = { id: string; src: string };

// Singleton -- there's only ever one FYP. Fields stay null until filled in via /admin/fyp.
export type Fyp = {
  title: string | null;
  description: string | null;
  githubUrl: string | null;
  datasetDescription: string | null;
  videoUrl: string | null;
  supervisor: string | null;
  lecturerFeedback: string | null;
  images: FypImage[];
};

// A chatbot question logged for review in /admin/chatbot -- see supabase/004_chat_logs.sql.
export type ChatLog = {
  id: string;
  question: string;
  answer: string;
  matched: boolean;
  topScore: number | null;
  cacheHit: boolean;
  latencyMs: number | null;
  createdAt: string;
};
