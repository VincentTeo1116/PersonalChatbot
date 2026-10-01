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

/** A "Request a meeting" form submission from a visitor -- see
 * supabase/007_meeting_requests.sql and /admin/meeting-requests. */
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

/** A question a visitor asked the chatbot, logged by the backend for review in
 * /admin/chatbot -- see supabase/004_chat_logs.sql. */
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
