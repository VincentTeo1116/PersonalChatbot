import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { getProfile } from "@/lib/data";
import MotionProvider from "@/components/MotionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Keep metadata, canonical links, robots.txt, and sitemap on the public domain.
// Override this in deployment environments if the preferred domain changes.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vincent16.vercel.app";
const SITE_DESCRIPTION =
  "Vincent Teo is an AI and machine learning developer in Kuala Lumpur, Malaysia, building practical AI products, RAG applications, and full-stack web experiences.";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      absolute: `${profile.name} | AI/ML Developer & Web Developer in Kuala Lumpur`,
    },
    description: SITE_DESCRIPTION,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: `${profile.name}'s Portfolio`,
      title: `${profile.name} | AI/ML Developer & Web Developer in Kuala Lumpur`,
      description: SITE_DESCRIPTION,
      locale: "en_MY",
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.name} | AI/ML Developer & Web Developer in Kuala Lumpur`,
      description: SITE_DESCRIPTION,
    },
  };
}

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const profile = await getProfile();

  // Person structured data -- lets Google build a richer result (and potential knowledge
  // panel) when someone searches the name, instead of just a plain blue link.
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.tagline,
    url: SITE_URL,
    image: profile.avatarUrl,
    description: profile.heroSummary,
    address: profile.location || undefined,
    sameAs: [profile.contact.github, profile.contact.linkedin].filter(Boolean),
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <MotionProvider>{children}</MotionProvider>
        <Analytics />
      </body>
    </html>
  );
}
