import type { Metadata } from "next";
import { ScheduleListing } from "@/components/schedule/schedule-listing";
import { getScheduleView } from "@/lib/schedule";

export const metadata: Metadata = { title: "Latest TV Premieres", description: "Recently aired series and season premieres." };

export default async function LatestPremieresPage() {
  const items = await getScheduleView("latest-premieres", 72);
  return <ScheduleListing eyebrow="New beginnings" title="Latest Premieres" description="Series and season premieres that aired during the last month." items={items} />;
}

