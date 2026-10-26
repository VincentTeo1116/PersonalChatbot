import { contentImage } from "@/lib/content-image";
import { getArticle } from "@/lib/writing";

export const alt = "AI and software engineering notes by Vincent Teo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return contentImage(getArticle((await params).slug)?.title || "Engineering notes", "IMPLEMENTATION NOTES · AI & SOFTWARE");
}
