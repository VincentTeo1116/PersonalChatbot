import Link from "next/link";
import ContentShell from "@/components/ContentShell";
import { getProfile, getProjects } from "@/lib/data";
import { contentMetadata, jsonLdString, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;
export const metadata = contentMetadata("Web Development in Kuala Lumpur | Vincent Teo", "Discuss a website, full-stack application, or AI integration with Vincent Teo in Kuala Lumpur. Explore relevant projects and a clear development process.", "/services");

export default async function ServicesPage() {
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);
  const examples = projects.filter((project) => ["apmoodle-lms", "portfolio-chatbot"].includes(project.slug));
  const data = { "@context": "https://schema.org", "@type": "Service", name: "Web and application development", serviceType: "Web development", url: `${SITE_URL}/services`, provider: { "@type": "Person", "@id": `${SITE_URL}/#person`, name: profile.name }, areaServed: { "@type": "Place", name: "Kuala Lumpur, Malaysia" } };
  return (
    <ContentShell eyebrow="Work with me" title="Web development with an AI and software engineering background" intro="Based in Kuala Lumpur, I build websites and applications and explore practical AI integrations. Share what you need, and we can work out the scope together.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
      <div className="mt-8 flex flex-wrap gap-4">
        <a href={`mailto:${profile.contact.email}`} className="inline-flex min-h-11 items-center rounded-full bg-indigo-600 px-6 font-medium text-white">Discuss your project</a>
        <Link href="/#contact" className="inline-flex min-h-11 items-center rounded-full border border-border px-6 text-foreground">Contact options</Link>
      </div>
      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-foreground">What we can build</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            ["Websites and portfolios", "Clear content, responsive layouts, contact flows, and a foundation for search discovery."],
            ["Full-stack applications", "Interfaces connected to APIs and databases, with content management and workflows shaped around your requirements."],
            ["AI integrations", "Assistants that retrieve information from your content, with visible sources and evaluation planned around the questions your users ask."],
          ].map(([title, description]) => <div key={title} className="rounded-2xl border border-border bg-surface p-5"><dt className="font-semibold text-foreground">{title}</dt><dd className="mt-3 text-sm leading-relaxed text-text-secondary">{description}</dd></div>)}
        </dl>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-foreground">Relevant work</h2>
        <div className="mt-6 space-y-6">{examples.map((project) => <div key={project.slug}><h3 className="text-lg font-semibold text-foreground"><Link href={`/projects/${project.slug}`} className="underline underline-offset-4">{project.title}</Link></h3><p className="mt-2 leading-relaxed text-text-secondary">{project.description}</p></div>)}</div>
      </section>
      <section className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold text-foreground">How a project starts</h2>
        <ol className="mt-6 list-decimal space-y-4 pl-5 leading-relaxed text-text-secondary">
          <li>Clarify the audience, problem, required content, budget, and desired timeline.</li>
          <li>Agree on the pages or workflows, technical approach, and what completion means.</li>
          <li>Build and review the implementation, including mobile usability and important user journeys.</li>
          <li>Plan deployment, ownership, content updates, and any ongoing support before handover.</li>
        </ol>
        <p className="mt-6 leading-relaxed text-text-secondary">Pricing and delivery depend on the agreed scope. Send an outline of your idea, any existing website, and the main result you want the application to deliver.</p>
      </section>
    </ContentShell>
  );
}
