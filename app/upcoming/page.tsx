import type { Metadata } from "next";
import { ScheduleListing } from "@/components/schedule/schedule-listing";
import { getScheduleView } from "@/lib/schedule";

export const metadata: Metadata = { title: "Upcoming TV Shows", description: "Countdowns for upcoming series premieres." };

export default async function UpcomingPage() {
  const items = await getScheduleView("upcoming", 60);
  return <ScheduleListing eyebrow="Starting soon" title="Upcoming TV Shows" description="New series ordered by their first episode airtime." items={items} />;
}

