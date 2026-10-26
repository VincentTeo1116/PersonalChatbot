import { ImageResponse } from "next/og";

export function contentImage(title: string, label: string) {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 80, background: "#110e24", color: "#f8fafc", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", color: "#c4b5fd", fontSize: 26, marginBottom: 30 }}>{label}</div>
      <div style={{ display: "flex", fontSize: title.length > 100 ? 44 : 56, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
      <div style={{ display: "flex", marginTop: 36, fontSize: 24, color: "#cbd5e1" }}>Vincent Teo · AI &amp; Software Engineering</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
