export type PortfolioEvent = "github_click" | "email_click" | "linkedin_click" | "contact_click" | "resume_open" | "meeting_request_open" | "generate_lead";

/** Classify the action only; never return email addresses, query strings, or form content. */
export function classifyLink(href: string, baseUrl: string): PortfolioEvent | null {
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol === "mailto:") return "email_click";
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (["github.com", "www.github.com"].includes(url.hostname)) return "github_click";
    if (["linkedin.com", "www.linkedin.com"].includes(url.hostname)) return "linkedin_click";
    if (url.origin === new URL(baseUrl).origin && url.hash === "#contact") return "contact_click";
    return null;
  } catch { return null; }
}
