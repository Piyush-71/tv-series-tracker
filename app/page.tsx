import { CarouselSection } from "@/components/media/carousel-section";
import { HeroBanner } from "@/components/media/hero-banner";
import { getByType, getFeaturedTitle, mediaTitles } from "@/data/media";

export default function Home() {
  const featured = getFeaturedTitle();
  const trending = [...mediaTitles].sort((a, b) => b.popularity - a.popularity);
  const thisWeek = mediaTitles.filter((item) => new Date(item.releaseDate) < new Date("2026-06-01"));
  const anticipated = mediaTitles.filter((item) => item.rating >= 8.7);

  return (
    <>
      <HeroBanner title={featured} />
      <CarouselSection title="Trending" eyebrow="Signal rising" items={trending} href="/trending" />
      <CarouselSection title="Releasing This Week" eyebrow="Nearly here" items={thisWeek} href="/explore" />
      <CarouselSection title="Most Anticipated" eyebrow="High voltage" items={anticipated} href="/explore" />
      <CarouselSection title="Anime" items={getByType("anime")} href="/category/anime" />
      <CarouselSection title="Movies" items={getByType("movie")} href="/category/movie" />
      <CarouselSection title="TV Shows" items={getByType("tv")} href="/category/tv" />
    </>
  );
}
