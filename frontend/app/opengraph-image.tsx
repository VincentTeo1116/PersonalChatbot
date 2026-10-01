import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/data";

export const alt = "Portfolio preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Every element needs an explicit display (satori, which renders this, doesn't support
// the default "block" layout) -- that's why every style below sets display explicitly,
// not an oversight.
export default async function Image() {
  const profile = await getProfile();

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
        <div style={{ display: "flex", fontSize: 28, color: "#a5b4fc", letterSpacing: 2 }}>
          {profile.location.toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: "white", marginTop: 20, lineHeight: 1.1 }}>
          {profile.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 42,
            fontWeight: 600,
            marginTop: 24,
            maxWidth: 980,
            backgroundImage: "linear-gradient(90deg, #818cf8, #c084fc, #e879f9)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {profile.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
