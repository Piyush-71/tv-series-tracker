import type { Metadata } from "next";
import { ExploreClient } from "@/components/media/explore-client";
import { mediaTitles } from "@/data/media";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse upcoming shows, movies, anime, and live events.",
};

export default function ExplorePage() {
  return (
    <section className="px-4 pb-14 pt-28 sm:px-6 lg:px-10">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Browse</p>
        <h1 className="mt-2 text-4xl font-black text-white sm:text-6xl">Explore premieres</h1>
        <p className="mt-4 text-zinc-400">Filter the full release slate by genre, type, year, and popularity.</p>
      </div>
      <ExploreClient items={mediaTitles} />
    </section>
  );
}
