import type { MetadataRoute } from "next";
import { getProjects, getResearch } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";
import { articles } from "@/lib/writing";

// Same cadence as the homepage: newly added projects show up without waiting for a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, papers] = await Promise.all([getProjects(), getResearch()]);

  return [
    // Omit lastModified for aggregate pages: multiple independent sections can change.
    { url: SITE_URL },
    { url: `${SITE_URL}/research` },
    { url: `${SITE_URL}/ai-lab` },
    { url: `${SITE_URL}/writing` },
    { url: `${SITE_URL}/services` },
    ...projects.map((p) => ({
      url: `${SITE_URL}/projects/${p.slug}`,
      lastModified: p.updatedAt,
    })),
    ...papers.map((paper) => ({ url: `${SITE_URL}/research/${paper.slug}`, lastModified: paper.updatedAt })),
    ...articles.map((article) => ({ url: `${SITE_URL}/writing/${article.slug}`, lastModified: article.updated })),
  ];
}
