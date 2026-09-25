import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { profile } from "../data/profile";
import { projects } from "../data/projects";
import { research } from "../data/research";
import { hackathonPhotos } from "../data/hackathons";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = "portfolio-content";
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

function contentTypeFor(filePath: string) {
  return filePath.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream";
}

async function uploadLocalFile(localPublicPath: string, storagePath: string) {
  const filePath = path.join(PUBLIC_DIR, localPublicPath);
  const data = fs.readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, data, { contentType: contentTypeFor(filePath), upsert: true });
  if (error) throw new Error(`Failed to upload ${localPublicPath} -> ${storagePath}: ${error.message}`);
  return storagePath;
}

async function main() {
  const force = process.env.FORCE === "1";

  const { data: existingProfile } = await supabase.from("profile").select("id").eq("id", 1).maybeSingle();
  if (existingProfile && !force) {
    console.log("profile row (id=1) already exists — aborting so we don't double-seed. Set FORCE=1 to re-run anyway.");
    return;
  }

  console.log("Seeding profile...");
  const { error: profileError } = await supabase.from("profile").upsert({
    id: 1,
    name: profile.name,
    tagline: profile.tagline,
    location: profile.location,
    hero_summary: profile.heroSummary,
    about: profile.about,
    avatar_path: null,
    skills: Object.entries(profile.skills).map(([category, items], i) => ({ category, items, sort_order: i })),
    stat_cgpa: 4.0,
    stat_hackathons: 4,
    contact_email: profile.contact.email,
    contact_github: profile.contact.github,
    contact_linkedin: profile.contact.linkedin,
    contact_resume_url: profile.contact.resumeUrl,
  });
  if (profileError) throw new Error(profileError.message);

  console.log("Seeding education...");
  for (const [i, ed] of profile.education.entries()) {
    const { data: row, error } = await supabase
      .from("education")
      .insert({
        degree: ed.degree,
        institution: ed.institution,
        period: ed.period,
        detail: ed.detail,
        sort_order: i,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "education insert failed");

    for (const [j, img] of ed.images.entries()) {
      const storagePath = `education/${row.id}/image-${j + 1}${path.extname(img.src)}`;
      await uploadLocalFile(img.src, storagePath);
      const { error: imgError } = await supabase
        .from("education_images")
        .insert({ education_id: row.id, storage_path: storagePath, caption: img.caption, sort_order: j });
      if (imgError) throw new Error(imgError.message);
    }
  }

  console.log("Seeding projects...");
  for (const [i, p] of projects.entries()) {
    const { data: row, error } = await supabase
      .from("projects")
      .insert({
        slug: p.slug,
        title: p.title,
        description: p.description,
        tags: p.tags,
        links: p.links,
        demo_video_url: p.demoVideoUrl ?? null,
        featured: p.featured ?? false,
        award: p.award ?? null,
        sort_order: i,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "project insert failed");

    const images = [p.image, ...(p.screenshots ?? [])];
    for (const [j, imgSrc] of images.entries()) {
      const storagePath = `projects/${row.id}/image-${j + 1}${path.extname(imgSrc)}`;
      await uploadLocalFile(imgSrc, storagePath);
      const { error: imgError } = await supabase
        .from("project_images")
        .insert({ project_id: row.id, storage_path: storagePath, is_cover: j === 0, sort_order: j });
      if (imgError) throw new Error(imgError.message);
    }
  }

  console.log("Seeding research...");
  for (const [i, r] of research.entries()) {
    const { data: row, error } = await supabase
      .from("research")
      .insert({
        slug: r.slug,
        title: r.title,
        venue: r.venue,
        authors: r.authors,
        supervisor: r.supervisor,
        doi: r.doi,
        doi_url: r.doiUrl,
        description: r.description,
        sort_order: i,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "research insert failed");

    const storagePath = `research/${row.id}/image-1${path.extname(r.image)}`;
    await uploadLocalFile(r.image, storagePath);
    const { error: updateError } = await supabase
      .from("research")
      .update({ image_path: storagePath })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
  }

  console.log("Seeding hackathon photos...");
  for (const [i, h] of hackathonPhotos.entries()) {
    const storagePath = `hackathons/image-${i + 1}${path.extname(h.src)}`;
    await uploadLocalFile(h.src, storagePath);
    const { error } = await supabase
      .from("hackathon_photos")
      .insert({ storage_path: storagePath, caption: h.caption, sort_order: i });
    if (error) throw new Error(error.message);
  }

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
