import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreClient } from "@/components/media/explore-client";
import { getBrowseOptions } from "@/lib/browse/service";

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover new series, returning seasons, anime, and movies by country, genre, premiere date, and rating.",
};

export default async function ExplorePage() {
  const options = await getBrowseOptions();

  return (
    <section className="px-4 pb-14 pt-28 sm:px-6 lg:px-10">
      <div className="mb-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Browse</p>
        <h1 className="mt-2 text-4xl font-black text-white sm:text-6xl">Explore premieres</h1>
        <p className="mt-4 text-zinc-400">Find new series, returning seasons, and movies. Browse by country of origin, genre, date, and rating.</p>
      </div>
      <Suspense fallback={<p className="py-10 text-zinc-400">Loading browse controls…</p>}><ExploreClient options={options} /></Suspense>
    </section>
  );
}
