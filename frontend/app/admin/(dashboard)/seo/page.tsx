import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { SITE_URL } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export default async function SeoStatusPage() {
  const supabase = await createClient();
  const [{ error: projectError }, { error: researchError }] = await Promise.all([
    supabase.from("projects").select("seo_title,seo_description").limit(0),
    supabase.from("research").select("case_study,seo_title,seo_description").limit(0),
  ]);
  const gaConfigured = /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_ID || "");
  const verificationConfigured = Boolean(process.env.NEXT_PUBLIC_GSC_VERIFICATION?.trim());
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Discovery" title="SEO & measurement" />
      <section className="admin-card space-y-4 p-6">
        <h2 className="font-semibold text-foreground">Configuration in this deployment</h2>
        <dl className="space-y-3 text-sm text-text-secondary">
          <div><dt className="font-medium text-foreground">Canonical website</dt><dd>{SITE_URL}</dd></div>
          <div><dt className="font-medium text-foreground">Search Console token</dt><dd>{verificationConfigured ? "Configured. Confirm ownership in Search Console." : "Missing: set NEXT_PUBLIC_GSC_VERIFICATION and redeploy."}</dd></div>
          <div><dt className="font-medium text-foreground">Google Analytics 4</dt><dd>{gaConfigured ? "Measurement ID configured. Confirm events in GA4 Realtime on the public production site." : "Missing or invalid: set NEXT_PUBLIC_GA_ID to your G-… Measurement ID and redeploy."}</dd></div>
          <div><dt className="font-medium text-foreground">Editorial SEO fields</dt><dd>{!projectError && !researchError ? "Available in Projects and Research." : "Check database access and apply supabase/014_editorial_seo.sql."}</dd></div>
        </dl>
        <p className="text-sm text-text-secondary">Configured tags do not establish Google verification, indexing, or traffic. Those require confirmation in your Google accounts. Analytics events are disabled in development and on admin pages.</p>
      </section>
      <section className="admin-card space-y-4 p-6">
        <h2 className="font-semibold text-foreground">Measure the first week</h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-text-secondary">
          <li>Verify this exact URL-prefix property in Search Console and submit <a href={`${SITE_URL}/sitemap.xml`} className="underline">sitemap.xml</a>.</li>
          <li>Inspect the homepage and your priority project, research, and writing URLs. Request indexing after confirming the pages are available.</li>
          <li>Check GA4 Realtime while clicking GitHub and submitting one genuine contact request on production. Mark generate_lead as a key event. Email and contact clicks indicate intent, not completed enquiries.</li>
          <li>Record Search Console impressions, clicks, queries, and indexed pages. Compare completed enquiries and GitHub clicks with that baseline, allowing for reporting delays and small samples.</li>
          <li>Review mobile Core Web Vitals in Search Console and the web_vital events in GA4. Missing field data may mean there is not enough traffic yet.</li>
        </ol>
        <div className="flex flex-wrap gap-4 text-sm text-indigo-600 dark:text-indigo-300">
          <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Search Console &rarr;</a>
          <a href="https://analytics.google.com/" target="_blank" rel="noreferrer">Google Analytics &rarr;</a>
          <Link href="/admin/projects">Edit project search text &rarr;</Link>
          <Link href="/admin/research">Edit research content &rarr;</Link>
        </div>
      </section>
    </div>
  );
}
