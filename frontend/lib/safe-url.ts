// Links come from database rows the admin edits. Only web links, mail links and paths on this site (like "/resume.pdf") are ever rendered, so a stored "javascript:" or "data:" URL can't become a clickable script.
export function safeUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const url = value.trim();
  return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(url) ? url : "";
}

export function safeLinks(value: unknown): { label: string; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({ label: String(item?.label ?? "").slice(0, 80), url: safeUrl(item?.url) }))
    .filter((link) => link.label && link.url);
}
