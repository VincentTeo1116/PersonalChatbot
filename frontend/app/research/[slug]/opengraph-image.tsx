import { getResearch } from "@/lib/data";
import { contentImage } from "@/lib/content-image";

export const alt = "Vincent Teo's machine learning research";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = (await getResearch()).find((value) => value.slug === slug);
  return contentImage(paper?.seoTitle || paper?.title || "Machine learning research", "RESEARCH · KUALA LUMPUR, MALAYSIA");
}
