export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vincent16.vercel.app").replace(/\/$/, "");

/** Turns a site-relative path (e.g. the "/avatar-placeholder.svg" fallback) into an absolute URL; absolute URLs pass through. */
export function absoluteUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, SITE_URL).toString();
}

/** Serialises JSON-LD for a <script> tag, escaping "<" so admin-entered text can't close the tag early. */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\u003c");
}
