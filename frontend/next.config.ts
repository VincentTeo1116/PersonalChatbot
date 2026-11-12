import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function hostOf(value: string | undefined): string | null {
  try {
    return value ? new URL(value).host : null;
  } catch {
    return null;
  }
}

function originOf(value: string | undefined): string | null {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

// The only Supabase project and chatbot backend this site talks to; everything else is blocked by the policy below.
const supabaseHost = hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const chatbotOrigin = originOf(process.env.NEXT_PUBLIC_CHATBOT_API_URL);
if (!supabaseHost) console.warn("[next.config] NEXT_PUBLIC_SUPABASE_URL is not set: remote images and the CSP will not allow Supabase.");

const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : "";

// Scripts stay 'unsafe-inline' because Next.js and the theme bootstrap inject inline scripts and a per-request nonce would make every page dynamic (no prerender/ISR). The policy still blocks other origins, framing, plugins and base-tag tricks.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://va.vercel-scripts.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin} https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com`.replace(/\s+/g, " "),
  "font-src 'self' data:",
  `connect-src 'self' ${chatbotOrigin ?? ""} https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://vitals.vercel-insights.com${isDev ? " ws: http://localhost:*" : ""}`.replace(/\s+/g, " "),
  "media-src 'self' blob: https:",
  `frame-src 'self' ${supabaseOrigin} https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com`.replace(/\s+/g, " "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Signed-in pages must never be stored by a browser or shared cache.
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  images: {
    // Exact project host only: a wildcard would let any Supabase project's files be fetched and resized through this site.
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
