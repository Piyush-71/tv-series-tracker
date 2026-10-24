import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/page-heading";
import { WatchlistClient } from "@/components/media/watchlist-client";

export const metadata: Metadata = {
  title: "My Countdowns",
};

export default function WatchlistPage() {
  return (
    <section className="page-shell page-section">
      <PageHeading
        eyebrow="Your personal lineup"
        title="My Countdowns"
        description="Everything you’re waiting for, in one place. Follow the next episode, check a release date, and make time for your favorites."
      />
      <div className="mt-8">
        <WatchlistClient />
      </div>
    </section>
  );
}
