import { ImageResponse } from "next/og";
import { getProjects } from "@/lib/data";

export const alt = "Project case study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);

  const title = project?.title ?? "Project";
  const description = project?.description ?? "";
  const snippet = description.length > 150 ? `${description.slice(0, 150)}…` : description;
  const tags = project?.tags.slice(0, 4) ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          background: "linear-gradient(135deg, #0f0a1f 0%, #1a1033 55%, #140a24 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: "#a5b4fc", letterSpacing: 2 }}>CASE STUDY</div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "white", marginTop: 18, lineHeight: 1.15 }}>
          {title}
        </div>
        {snippet && (
          <div style={{ display: "flex", fontSize: 28, color: "#cbd5e1", marginTop: 24, maxWidth: 950, lineHeight: 1.4 }}>
            {snippet}
          </div>
        )}
        {tags.length > 0 && (
          <div style={{ display: "flex", gap: 14, marginTop: 36 }}>
            {tags.map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "10px 20px",
                  borderRadius: 999,
                  border: "1px solid #6d28d9",
                  color: "#e9d5ff",
                  fontSize: 22,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
