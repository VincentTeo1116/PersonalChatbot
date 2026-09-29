import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type {
  ChatLog,
  EducationEntry,
  HackathonPhoto,
  Profile,
  Project,
  Publication,
  SkillCategory,
  SkillItem,
  Testimonial,
  WorkExperience,
} from "@/lib/types";

const BUCKET = "portfolio-content";

function publicUrl(supabase: SupabaseClient, path: string | null | undefined, fallback: string) {
  if (!path) return fallback;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// items can be either the old shape (plain skill-name strings) or the new shape (with a
// proficiency level) -- normalizeSkillItem() below is the one place that reconciles both,
// so every other file in the app can assume SkillItem{name, level} and never has to know
// this migration happened.
type RawSkillItem = string | { name: string; level?: number };
type SkillsJson = { category: string; sort_order?: number; items: RawSkillItem[] }[];
const DEFAULT_SKILL_LEVEL = 4; // shown for legacy plain-string skills with no saved level

function normalizeSkillItem(item: RawSkillItem): SkillItem {
  if (typeof item === "string") return { name: item, level: DEFAULT_SKILL_LEVEL };
  return { name: item.name, level: item.level ?? DEFAULT_SKILL_LEVEL };
}

export const getProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();

  const [{ data: profileRow }, education] = await Promise.all([
    supabase.from("profile").select("*").eq("id", 1).single(),
    getEducation(),
  ]);

  if (!profileRow) {
    throw new Error("profile row (id=1) not found — run supabase/seed.sql first");
  }

  const skillsJson = (profileRow.skills ?? []) as SkillsJson;
  const skills: SkillCategory[] = [...skillsJson]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s) => ({ category: s.category, items: (s.items ?? []).map(normalizeSkillItem) }));

  return {
    name: profileRow.name,
    tagline: profileRow.tagline,
    location: profileRow.location,
    heroSummary: profileRow.hero_summary,
    about: profileRow.about,
    avatarUrl: publicUrl(supabase, profileRow.avatar_path, "/avatar-placeholder.svg"),
    education,
    skills,
    statCgpa: profileRow.stat_cgpa,
    statHackathons: profileRow.stat_hackathons,
    contact: {
      email: profileRow.contact_email,
      github: profileRow.contact_github,
      linkedin: profileRow.contact_linkedin,
      // An uploaded resume (resume_path, via Storage) takes priority over a manually
      // typed external URL, so re-uploading a new PDF from /admin always wins.
      resumeUrl: publicUrl(supabase, profileRow.resume_path, profileRow.contact_resume_url ?? ""),
    },
  };
});

/** Testimonials/recommendations shown as social proof on the public site. Returns []
 * on any error (most likely 005_testimonials.sql hasn't been run yet) so the homepage
 * never crashes over this -- it just renders no testimonials section instead. */
export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("testimonials").select("*").order("sort_order");
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    authorName: row.author_name,
    authorRole: row.author_role,
    quote: row.quote,
    avatarUrl: row.avatar_path ? publicUrl(supabase, row.avatar_path, "") : null,
  }));
});

export const getEducation = cache(async (): Promise<EducationEntry[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("education")
    .select("*, education_images(*)")
    .order("sort_order");

  return (data ?? []).map((row) => ({
    id: row.id,
    degree: row.degree,
    institution: row.institution,
    period: row.period,
    detail: row.detail,
    images: [...(row.education_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({
        src: publicUrl(supabase, img.storage_path, "/education/placeholder-1.svg"),
        caption: img.caption,
      })),
  }));
});

export const getProjects = cache(async (): Promise<Project[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*, project_images(*)")
    .order("sort_order");

  return (data ?? []).map((row) => {
    const images = [...(row.project_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const cover = images.find((img) => img.is_cover) ?? images[0];
    const rest = images.filter((img) => img.id !== cover?.id);

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      tags: row.tags ?? [],
      image: publicUrl(supabase, cover?.storage_path, "/projects/placeholder.svg"),
      screenshots: rest.length > 0
        ? rest.map((img) => publicUrl(supabase, img.storage_path, "/projects/placeholder.svg"))
        : undefined,
      demoVideoUrl: row.demo_video_url ?? undefined,
      links: row.links ?? [],
      featured: row.featured ?? undefined,
      award: row.award ?? undefined,
    };
  });
});

export const getResearch = cache(async (): Promise<Publication[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("research").select("*").order("sort_order");

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    venue: row.venue,
    authors: row.authors ?? [],
    supervisor: row.supervisor,
    doi: row.doi,
    doiUrl: row.doi_url,
    description: row.description,
    image: publicUrl(supabase, row.image_path, "/projects/placeholder.svg"),
  }));
});

export const getHackathonPhotos = cache(async (): Promise<HackathonPhoto[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("hackathon_photos").select("*").order("sort_order");

  return (data ?? []).map((row) => ({
    id: row.id,
    src: publicUrl(supabase, row.storage_path, "/hackathons/placeholder-1.svg"),
    caption: row.caption,
  }));
});

export const getWorkExperience = cache(async (): Promise<WorkExperience[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("work_experience")
    .select("*, work_experience_images(*)")
    .order("sort_order");

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role,
    company: row.company,
    period: row.period,
    detail: row.detail,
    logoUrl: row.logo_path
      ? supabase.storage.from(BUCKET).getPublicUrl(row.logo_path).data.publicUrl
      : null,
    images: [...(row.work_experience_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({
        src: publicUrl(supabase, img.storage_path, "/education/placeholder-2.svg"),
        caption: img.caption,
      })),
  }));
});

/** Recent questions visitors asked the chatbot (see supabase/004_chat_logs.sql).
 * Returns [] on any error -- most likely that migration hasn't been run yet -- so the
 * admin page never crashes over this, it just shows an empty state instead. */
export const getChatLogs = cache(async (limit = 50): Promise<ChatLog[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    matched: row.matched,
    topScore: row.top_score,
    cacheHit: row.cache_hit,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
  }));
});
