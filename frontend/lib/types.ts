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

export type SkillCategory = {
  category: string;
  items: string[];
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
