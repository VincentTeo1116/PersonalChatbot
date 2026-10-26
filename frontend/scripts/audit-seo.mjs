import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Read-only audit of public pages. Run against production or a local server after deployment/build.
const base = new URL(process.argv[2] || "https://vincent16.vercel.app");
const canonicalBase = new URL(process.argv[3] || base.href);
if (!["http:", "https:"].includes(base.protocol)) throw new Error("Use an HTTP(S) site URL.");
const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.generated");
const decode = (text = "") => text.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((match) => [match[1].toLowerCase(), decode(match[2])]));

async function read(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "PortfolioSEOAudit/1.0" } });
    return { status: response.status, finalUrl: response.url, body: await response.text(), robotsHeader: response.headers.get("x-robots-tag") };
  } catch (error) { return { status: null, error: error.message, body: "" }; }
}

async function inspect(url) {
  const page = await read(url);
  const meta = [...page.body.matchAll(/<meta\b[^>]*>/gi)].map((m) => attributes(m[0]));
  const links = [...page.body.matchAll(/<link\b[^>]*>/gi)].map((m) => attributes(m[0]));
  const schemas = [...page.body.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const robots = meta.find((tag) => tag.name === "robots")?.content || page.robotsHeader || "";
  const title = decode(page.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const description = meta.find((tag) => tag.name === "description")?.content || "";
  const canonical = links.find((tag) => tag.rel === "canonical")?.href || "";
  const issues = [];
  if (page.status !== 200) issues.push(`HTTP status: ${page.status ?? "unreachable"}`);
  if (!title) issues.push("Missing title");
  if (!description) issues.push("Missing description");
  if (!canonical) issues.push("Missing canonical");
  else {
    try {
      const expected = new URL(new URL(url).pathname, canonicalBase).href;
      if (new URL(canonical, url).href !== expected) issues.push("Canonical does not match this page's preferred URL");
    } catch { issues.push("Invalid canonical URL"); }
  }
  if (/noindex/i.test(robots)) issues.push("Public content marked noindex");
  if (!/<h1\b/i.test(page.body)) issues.push("Missing H1");
  for (const schema of schemas) {
    try { JSON.parse(schema[1]); } catch { issues.push("Invalid JSON-LD"); }
  }
  return { url, status: page.status, finalUrl: page.finalUrl, error: page.error, title, description, canonical, robots, structuredDataBlocks: schemas.length, verificationTagPresent: meta.some((tag) => tag.name === "google-site-verification" && tag.content), gaTagPresent: /googletagmanager\.com\/gtag\/js\?id=G-/.test(page.body), issues };
}

const [robots, sitemap] = await Promise.all([read(new URL("/robots.txt", base)), read(new URL("/sitemap.xml", base))]);
const allLocations = [...sitemap.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => decode(m[1]));
const locations = allLocations.filter((url) => { try { return new URL(url).origin === canonicalBase.origin; } catch { return false; } });
const urls = [...new Set([base.href, ...locations.map((url) => new URL(new URL(url).pathname, base).href)])].slice(0, 16);
const pages = [];
for (let index = 0; index < urls.length; index += 4) pages.push(...await Promise.all(urls.slice(index, index + 4).map(inspect)));
const routeChecks = await Promise.all(["/projects/__seo-audit-missing__", "/research/__seo-audit-missing__", "/writing/__seo-audit-missing__", "/admin/login"].map(async (pathname) => {
  const result = await read(new URL(pathname, base));
  const ok = pathname === "/admin/login" ? result.status === 200 && /noindex/.test(result.robotsHeader || "") : result.status === 404;
  return { path: pathname, status: result.status, passed: ok };
}));
const imagePaths = ["/research/", "/writing/"].flatMap((prefix) => {
  const match = urls.find((url) => new URL(url).pathname.startsWith(prefix));
  return match ? [`${new URL(match).pathname}/opengraph-image`] : [];
});
for (const pathname of imagePaths) {
  try {
    const response = await fetch(new URL(pathname, base), { signal: AbortSignal.timeout(20000) });
    const size = (await response.arrayBuffer()).byteLength;
    routeChecks.push({ path: pathname, status: response.status, passed: response.ok && response.headers.get("content-type")?.includes("image/png") && size > 0 });
  } catch { routeChecks.push({ path: pathname, status: null, passed: false }); }
}
const report = { checkedAt: new Date().toISOString(), site: base.href, robots: { status: robots.status, body: robots.body, error: robots.error }, sitemap: { status: sitemap.status, discoveredUrls: locations.length, invalidOrForeignUrls: allLocations.length - locations.length, error: sitemap.error }, pages, routeChecks };
await fs.mkdir(directory, { recursive: true });
const output = path.join(directory, "seo-audit.json");
await fs.writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, sitemapStatus: sitemap.status, checkedPages: pages.length, pages: pages.map(({ url, status, issues, verificationTagPresent, gaTagPresent }) => ({ url, status, issues, verificationTagPresent, gaTagPresent })), routeChecks }, null, 2));
if (pages.some((page) => page.issues.length) || routeChecks.some((check) => !check.passed) || sitemap.status !== 200 || robots.status !== 200 || !locations.length || allLocations.length !== locations.length) process.exitCode = 1;
