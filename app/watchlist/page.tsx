import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/page-heading";
import { WatchlistClient } from "@/components/media/watchlist-client";
import { getAllTitles } from "@/lib/tmdb/service";
import { getFollowableSchedule } from "@/lib/schedule";

export const metadata: Metadata = {
  title: "Watchlist",
};

export default async function WatchlistPage() {
  const [items, schedule] = await Promise.all([
    getAllTitles(),
    getFollowableSchedule(),
  ]);

  return (
    <section className="page-shell page-section">
      <PageHeading
        eyebrow="A collection of your own"
        title="My Countdowns"
        description="The next episodes of your favorite shows, and every story you’ve saved for later."
      />
      <div className="mt-8">
        <WatchlistClient items={items} schedule={schedule} />
      </div>
    </section>
  );
}
