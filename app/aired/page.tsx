import type { Metadata } from "next";
import { ScheduleListing } from "@/components/schedule/schedule-listing";
import { getScheduleView } from "@/lib/schedule";

export const metadata: Metadata = { title: "Recently Aired TV Shows", description: "TV episodes that aired during the last seven days." };

export default async function RecentlyAiredPage() {
  const items = await getScheduleView("recently-aired", 72);
  return <ScheduleListing eyebrow="Just broadcast" title="Recently Aired" description="Episodes from the last seven days, with a live count-up since airtime." items={items} />;
}

