import type { Metadata } from "next";
import { ScheduleDashboard } from "@/components/schedule/schedule-dashboard";
import { getScheduleDashboard } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "TV Show Countdowns and Episode Schedule",
  description: "Live countdowns for trending TV shows, upcoming series premieres, and the next episodes airing in your timezone.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const dashboard = await getScheduleDashboard(8);
  return <ScheduleDashboard dashboard={dashboard} />;
}
