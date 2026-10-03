import type { Metadata } from "next";
import { ScheduleListing } from "@/components/schedule/schedule-listing";
import { getScheduleView } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Trending TV Show Countdowns",
  description: "Popular TV shows ordered by their next scheduled episode.",
};

export default async function TrendingPage() {
  const items = await getScheduleView("trending", 60);
  return <ScheduleListing eyebrow="Heat index" title="Trending TV Shows" description="The most popular shows with an announced next episode and exact local countdown." items={items} />;
}
