import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cinecount",
    short_name: "Cinecount",
    description: "TV episode schedules and release countdowns.",
    start_url: "/",
    display: "standalone",
    background_color: "#191817",
    theme_color: "#ff986b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
