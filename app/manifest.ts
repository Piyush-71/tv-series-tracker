import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cinecount",
    short_name: "Cinecount",
    description: "TV episode schedules and release countdowns.",
    start_url: "/",
    display: "standalone",
    background_color: "#020205",
    theme_color: "#7c3aed",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}

