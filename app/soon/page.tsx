import type { Metadata } from "next";
import { ScheduleListing } from "@/components/schedule/schedule-listing";
import { getScheduleView } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "TV Shows Airing Soon",
  description: "The next announced TV episodes ordered by exact airtime.",
};

export default async function AiringSoonPage() {
  const items = await getScheduleView("airing-soon", 72);
  return (
    <ScheduleListing
      eyebrow="Next on the clock"
      title="Airing Soon"
      description="The next announced episodes, ordered by exact airtime in your timezone."
      items={items}
    />
  );
}
