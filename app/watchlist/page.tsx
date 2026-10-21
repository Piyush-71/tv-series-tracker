import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/page-heading";
import { WatchlistClient } from "@/components/media/watchlist-client";

export const metadata: Metadata = {
  title: "Watchlist",
};

export default function WatchlistPage() {
  return (
    <section className="page-shell page-section">
      <PageHeading
        eyebrow="A collection of your own"
        title="My Countdowns"
        description="The next episodes of your favorite shows, and every story you’ve saved for later."
      />
      <div className="mt-8">
        <WatchlistClient />
      </div>
    </section>
  );
}
