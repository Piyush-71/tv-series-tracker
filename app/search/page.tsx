import type { Metadata } from "next";
import { MediaGrid } from "@/components/media/media-grid";
import { searchTitles } from "@/lib/tmdb/service";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const results = await searchTitles(q);

  return (
    <section className="px-4 pb-14 pt-28 sm:px-6 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Search</p>
      <h1 className="mt-2 text-4xl font-black text-white sm:text-6xl">
        {q ? `Results for "${q}"` : "Search results"}
      </h1>
      <p className="mt-4 text-zinc-400">{results.length} titles found.</p>
      <div className="mt-8">
        <MediaGrid items={results} />
      </div>
    </section>
  );
}
