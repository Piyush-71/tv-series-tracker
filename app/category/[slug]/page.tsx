import type { Metadata } from "next";
import { MediaGrid } from "@/components/media/media-grid";
import { getAllTitles, getTitlesByQuery } from "@/lib/tmdb/service";
import { slugToTitle } from "@/lib/utils";
import type { MediaType } from "@/types/media";

type Props = {
  params: Promise<{ slug: string }>;
};

const typeSlugs: Record<string, MediaType> = {
  tv: "tv",
  television: "tv",
  movie: "movie",
  movies: "movie",
  anime: "anime",
  event: "event",
  events: "event",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: slugToTitle(slug),
    description: `Browse ${slugToTitle(slug)} releases on Cinecount.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const label = slugToTitle(slug);
  const items = typeSlugs[slug] ? await getTitlesByQuery({ type: typeSlugs[slug] }) : await getTitlesByQuery({ genre: label });
  const fallback = items.length ? items : await getAllTitles();

  return (
    <section className="px-4 pb-14 pt-28 sm:px-6 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-300">Category</p>
      <h1 className="mt-2 text-4xl font-black text-white sm:text-6xl">{label}</h1>
      <p className="mt-4 text-zinc-400">{fallback.length} upcoming releases in this lane.</p>
      <div className="mt-8">
        <MediaGrid items={fallback} />
      </div>
    </section>
  );
}
