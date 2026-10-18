import { ImageResponse } from "next/og";

export const alt = "Cinecount TV release countdowns";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          color: "#f4f5ef",
          background:
            "#101210",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 700,
            color: "#d5f56a",
          }}
        >
          CINECOUNT · THE EPISODE EDIT
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
          Good stories. Worth the wait.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 30,
            fontSize: 28,
            color: "#a8afa5",
          }}
        >
          Trending · Upcoming · Airing Soon
        </div>
      </div>
    ),
    size,
  );
}
