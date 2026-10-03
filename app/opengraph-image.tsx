import { ImageResponse } from "next/og";

export const alt = "Cinecount TV release countdowns";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, color: "white", background: "radial-gradient(circle at 20% 10%, #4c1d95, transparent 45%), radial-gradient(circle at 80% 10%, #164e63, transparent 40%), #020205" }}>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#c4b5fd" }}>CINECOUNT · LIVE RELEASE RADAR</div>
      <div style={{ display: "flex", marginTop: 28, fontSize: 78, lineHeight: 1.05, fontWeight: 900, maxWidth: 1000 }}>TV countdowns and exact episode schedules.</div>
      <div style={{ display: "flex", marginTop: 30, fontSize: 28, color: "#a1a1aa" }}>Trending · Upcoming · Airing Soon</div>
    </div>,
    size,
  );
}
