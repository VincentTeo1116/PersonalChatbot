import ContentShell from "@/components/ContentShell";
import ConsentPreferences from "@/components/ConsentPreferences";
import { getProfile } from "@/lib/data";
import { contentMetadata } from "@/lib/seo";

export const metadata = contentMetadata(
  "Privacy Policy | Vincent Teo",
  "What personal data this portfolio collects, why, who processes it, how long it is kept, and how to ask for it to be corrected or deleted.",
  "/privacy",
);

const UPDATED = "12 November 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

export default async function PrivacyPage() {
  const profile = await getProfile();
  const email = profile.contact.email;

  return (
    <ContentShell
      eyebrow="Privacy"
      title="Privacy policy"
      intro={`This is the personal portfolio of ${profile.name}. This page explains what personal data it collects, why, who handles it, and how to contact me about it. Last updated ${UPDATED}.`}
    >
      <Section title="What I collect and why">
        <p>
          <strong className="text-foreground">Meeting requests.</strong> If you use &ldquo;Request a meeting&rdquo;, I receive the name, job title,
          company, email address, phone number and optional message you type. I use them only to reply to you.
        </p>
        <p>
          <strong className="text-foreground">Testimonials.</strong> If you leave a testimonial, I receive your name, role and the text. It is held
          privately until I approve it; once approved, your name, role and text are shown publicly on this site.
        </p>
        <p>
          <strong className="text-foreground">Chat assistant.</strong> The questions you ask the assistant, its answers, and any thumbs up or down
          you give are stored so I can see what visitors want to know and improve the answers. Please don&apos;t type personal or confidential
          information into the chat. Your questions are sent to AI service providers (Groq for the reply and Google for search embeddings) to produce
          an answer.
        </p>
        <p>
          <strong className="text-foreground">Visit statistics.</strong> Vercel Web Analytics counts page views and interactions without cookies.
          Google Analytics is used only if you click Accept in the cookie banner, and it sets cookies. Nothing is sent to Google before you accept.
        </p>
      </Section>

      <Section title="Your analytics choice">
        <p>You can change your mind at any time.</p>
        <ConsentPreferences />
      </Section>

      <Section title="Who handles the data">
        <p>
          I use these services to run the site: Vercel (hosting and analytics), Supabase (database and file storage), Render (the chat assistant&apos;s
          server), Pinecone, Groq and Google (the assistant&apos;s search and answers), Resend (email notifications) and, if you accept it,
          Google Analytics. Some of these are located outside Malaysia, so your data may be processed in other countries.
        </p>
      </Section>

      <Section title="How long I keep it">
        <p>
          Meeting requests are kept for as long as needed to reply to you and are then deleted. Chat questions and feedback are deleted
          periodically; I aim to remove them within 90 days. Approved testimonials stay on the site until you ask me to remove them.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <p>
          You can ask me to show you the personal data I hold about you, correct it, or delete it, and you can withdraw your consent for analytics at
          any time using the controls above. To do so, email{" "}
          {email ? (
            <a className="font-medium text-indigo-600 underline dark:text-indigo-300" href={`mailto:${email}`}>
              {email}
            </a>
          ) : (
            "me through the contact section"
          )}
          . I will reply as soon as I can.
        </p>
        <p>This site is not intended for children, and I do not sell personal data.</p>
      </Section>
    </ContentShell>
  );
}
