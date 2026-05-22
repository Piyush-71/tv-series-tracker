import type { Metadata } from "next";
import { MediaGrid } from "@/components/media/media-grid";
import { getCatalog } from "@/lib/tmdb/service";

export const metadata: Metadata = {
  title: "Trending Releases",
};

export default async function TrendingPage() {
  const { trending } = await getCatalog();

  return (
    <section className="px-4 pb-14 pt-28 sm:px-6 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-300">Heat index</p>
      <h1 className="mt-2 text-4xl font-black text-white sm:text-6xl">Trending releases</h1>
      <div className="mt-8">
        <MediaGrid items={trending} />
      </div>
    </section>
  );
}
