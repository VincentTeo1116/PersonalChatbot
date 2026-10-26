export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vincent16.vercel.app").replace(/\/$/, "");

/** Turns a site-relative path (e.g. the "/avatar-placeholder.svg" fallback) into an absolute URL; absolute URLs pass through. */
export function absoluteUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, SITE_URL).toString();
}

/** Serialises JSON-LD for a <script> tag, escaping "<" so admin-entered text can't close the tag early. */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** A compact readable summary, without cutting a word in half. */
export function metaDescription(text: string, limit = 160) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

export function contentMetadata(title: string, description: string, path: string) {
  const url = absoluteUrl(path);
  return {
    title: { absolute: title },
    description: metaDescription(description),
    alternates: { canonical: url },
    openGraph: { type: "website" as const, url, title, description: metaDescription(description), images: [absoluteUrl("/opengraph-image")] },
    twitter: { card: "summary_large_image" as const, title, description: metaDescription(description), images: [absoluteUrl("/opengraph-image")] },
  };
}
