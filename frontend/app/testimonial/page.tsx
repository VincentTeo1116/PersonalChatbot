import type { Metadata } from "next";
import Link from "next/link";
import TestimonialSubmitForm from "@/components/TestimonialSubmitForm";
import ThemeToggle from "@/components/ThemeToggle";
import { getProfile } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

// The shareable invite page for /admin's "Invite link". Kept out of search results: it's a
// form people reach from a message you send them, not something to rank.
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  const title = `Leave a testimonial for ${profile.name}`;
  const description = `Share a few words about working with ${profile.name}. Testimonials are reviewed before they appear on the portfolio.`;
  // Setting openGraph here replaces the root layout's, which drops its generated card, so point
  // at it explicitly or shared links would preview without an image.
  const image = { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: title };
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/testimonial` },
    robots: { index: false, follow: false },
    openGraph: { type: "website", url: `${SITE_URL}/testimonial`, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function TestimonialInvitePage() {
  const profile = await getProfile();

  return (
    <main className="flex-1">
      <header className="mx-auto flex max-w-xl items-center justify-between px-6 pt-8">
        <Link href="/" className="text-sm font-medium text-text-secondary transition-colors hover:text-foreground">
          &larr; {profile.name}&apos;s portfolio
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto max-w-xl px-6 pb-24 pt-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Leave a testimonial for {profile.name}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-text-secondary">
          Thanks for taking a minute. A few honest sentences about working together mean a lot.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6">
          <TestimonialSubmitForm done={{ label: "Back to the portfolio", href: "/" }} />
        </div>
      </div>
    </main>
  );
}
