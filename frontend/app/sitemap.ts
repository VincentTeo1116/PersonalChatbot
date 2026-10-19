import type { MetadataRoute } from "next";
import { getProfile, getProjects } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

// Same cadence as the homepage: newly added projects show up without waiting for a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);

  // The homepage shows every section, so it changed whenever the profile or any project did.
  const latest = [profile.updatedAt, ...projects.map((p) => p.updatedAt)].sort().at(-1);

  return [
    { url: SITE_URL, lastModified: latest },
    ...projects.map((p) => ({
      url: `${SITE_URL}/projects/${p.slug}`,
      lastModified: p.updatedAt,
    })),
  ];
}
