import type { Metadata } from "next";
import { WatchlistClient } from "@/components/media/watchlist-client";
import { getAllTitles } from "@/lib/tmdb/service";

export const metadata: Metadata = {
  title: "Watchlist",
};

export default async function WatchlistPage() {
  const items = await getAllTitles();

  return (
    <section className="px-4 pb-14 pt-28 sm:px-6 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-300">Saved</p>
      <h1 className="mt-2 text-4xl font-black text-white sm:text-6xl">Your watchlist</h1>
      <div className="mt-8">
        <WatchlistClient items={items} />
      </div>
    </section>
  );
}
