import { ImageResponse } from "next/og";

export const alt = "Cinecount TV release countdowns";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 72,
        color: "#f2f3ff",
        background: "#080b16",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 700,
          color: "#b8a0ff",
        }}
      >
        CINECOUNT · YOUR ENTERTAINMENT RADAR
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: 78,
          lineHeight: 1.05,
          fontWeight: 700,
          maxWidth: 1000,
        }}
      >
        Your next obsession. On the horizon.
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 30,
          fontSize: 28,
          color: "#a6aec9",
        }}
      >
        Trending · Upcoming · Airing Soon
      </div>
    </div>,
    size,
  );
}
