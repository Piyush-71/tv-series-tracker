import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeading } from "@/components/layout/page-heading";
import { MediaGrid } from "@/components/media/media-grid";
import { getTitlesByQuery } from "@/lib/tmdb/service";
import { slugToTitle } from "@/lib/utils";
import type { MediaType } from "@/types/media";
type Props = { params: Promise<{ slug: string }> };
const typeSlugs: Record<string, MediaType> = {
  tv: "tv",
  television: "tv",
  movie: "movie",
  movies: "movie",
  anime: "anime",
  event: "event",
  events: "event",
};
const labels: Record<string, string> = {
  tv: "TV series",
  television: "TV series",
  movie: "Movies",
  movies: "Movies",
  anime: "Anime",
  event: "Events",
  events: "Events",
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: labels[slug] ?? slugToTitle(slug),
    description: `Discover ${labels[slug] ?? slugToTitle(slug)} on Cinecount.`,
  };
}
export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const label = labels[slug] ?? slugToTitle(slug);
  const items = await getTitlesByQuery(
    typeSlugs[slug] ? { type: typeSlugs[slug] } : { genre: label },
  );
  return (
    <section className="page-shell page-section">
      <Link
        href="/explore"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        All titles
      </Link>
      <PageHeading
        eyebrow="Find your kind of story"
        title={label}
        description={`${items.length} ${items.length === 1 ? "title" : "titles"} to explore. A new favorite could be waiting.`}
      />
      <MediaGrid items={items} />
    </section>
  );
}
