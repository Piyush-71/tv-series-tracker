import type { Metadata } from "next";
import { EpisodeCalendar } from "@/components/tracker/episode-calendar";

export const metadata: Metadata = { title: "Episode Calendar", description: "Upcoming episodes for shows in your watchlist." };

export default function CalendarPage() {
  return <EpisodeCalendar />;
}
