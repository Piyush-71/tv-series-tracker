import { CarouselSection } from "@/components/media/carousel-section";
import { HeroBanner } from "@/components/media/hero-banner";
import { getCatalog } from "@/lib/tmdb/service";

export default async function Home() {
  const catalog = await getCatalog();

  return (
    <>
      <HeroBanner title={catalog.featured} />
      <CarouselSection title="Trending" eyebrow="Signal rising" items={catalog.trending} href="/trending" />
      <CarouselSection title="Releasing This Week" eyebrow="Nearly here" items={catalog.thisWeek} href="/explore" />
      <CarouselSection title="Most Anticipated" eyebrow="High voltage" items={catalog.anticipated} href="/explore" />
      <CarouselSection title="Anime" items={catalog.anime} href="/category/anime" />
      <CarouselSection title="Movies" items={catalog.movies} href="/category/movie" />
      <CarouselSection title="TV Shows" items={catalog.tv} href="/category/tv" />
    </>
  );
}
