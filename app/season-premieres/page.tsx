import type { Metadata } from "next";
import { ScheduleListing } from "@/components/schedule/schedule-listing";
import { getScheduleView } from "@/lib/schedule";

export const metadata: Metadata = { title: "Season Premieres", description: "Upcoming first episodes for new and returning TV seasons." };

export default async function SeasonPremieresPage() {
  const items = await getScheduleView("season-premieres", 60);
  return <ScheduleListing eyebrow="Fresh seasons" title="Season Premieres" description="The first episode of upcoming new and returning seasons." items={items} />;
}

