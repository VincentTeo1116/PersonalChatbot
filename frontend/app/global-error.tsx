"use client";

import { useEffect } from "react";

// Replaces the root layout when the layout itself fails (it reads the profile from the database), so it brings its own document and inline styles: the site's stylesheet and theme are not available here.
const page = {
  margin: 0,
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  textAlign: "center",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  background: "#0b1020",
  color: "#f1f5f9",
} as const;

const button = {
  borderRadius: "999px",
  padding: "12px 24px",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
} as const;

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={page}>
        <title>Temporarily unavailable | Vincent Teo</title>
        <h1 style={{ fontSize: "24px", margin: 0 }}>The site is temporarily unavailable</h1>
        <p style={{ maxWidth: "24rem", fontSize: "14px", lineHeight: 1.6, color: "#cbd5e1" }}>
          Something went wrong on my side, and it is usually temporary. Please try again in a moment.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginTop: "16px" }}>
          <button type="button" onClick={() => retry()} style={{ ...button, border: "none", background: "#6366f1", color: "#ffffff" }}>
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ ...button, border: "1px solid #475569", color: "#f1f5f9" }}>
            Reload homepage
          </a>
        </div>
      </body>
    </html>
  );
}
