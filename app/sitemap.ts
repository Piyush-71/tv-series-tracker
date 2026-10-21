import type { MetadataRoute } from "next";
import { getScheduleView } from "@/lib/schedule";
import { getSiteOrigin } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteOrigin();
  if (!baseUrl) return [];
  const staticRoutes = [
    "",
    "/trending",
    "/upcoming",
    "/season-premieres",
    "/soon",
    "/aired",
    "/premieres",
    "/explore",
  ];
  const episodes = await getScheduleView("airing-soon", 200);
  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      changeFrequency: "hourly" as const,
      priority: route ? 0.8 : 1,
    })),
    ...episodes.map((item) => ({
      url: `${baseUrl}/show/${item.showId}/${item.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
