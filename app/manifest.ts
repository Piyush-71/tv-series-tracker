import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cinecount",
    short_name: "Cinecount",
    description: "TV episode schedules and release countdowns.",
    start_url: "/",
    display: "standalone",
    background_color: "#101210",
    theme_color: "#d5f56a",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}

