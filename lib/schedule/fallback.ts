import { mediaTitles } from "@/data/media";
import type { ScheduledEpisode } from "@/types/schedule";

const hour = 3_600_000;

export function getFallbackSchedule(now = new Date()): ScheduledEpisode[] {
  const anchor = new Date(now);
  anchor.setUTCMinutes(0, 0, 0);

  return mediaTitles.flatMap((title, index) => {
    const showId = `fallback-${title.id}`;
    const nextAirsAt = new Date(anchor.getTime() + (index + 1) * 3 * hour).toISOString();
    const previousAirsAt = new Date(anchor.getTime() - (index + 1) * 6 * hour).toISOString();
    const premiereAirsAt = new Date(anchor.getTime() - (30 + index) * 24 * hour).toISOString();

    const common = {
      showId,
      title: title.title,
      slug: title.slug,
      poster: title.poster,
      precision: "datetime" as const,
      rank: 100 + index,
      rating: title.rating,
      sourceUrl: `/title/${title.slug}`,
    };

    return [
      {
        ...common,
        id: `${showId}-s1e1`,
        seasonNumber: 1,
        episodeNumber: 1,
        airsAt: premiereAirsAt,
        kind: "series-premiere" as const,
      },
      {
        ...common,
        id: `${showId}-previous`,
        seasonNumber: 2,
        episodeNumber: Math.max(index, 1),
        airsAt: previousAirsAt,
        kind: "episode" as const,
      },
      {
        ...common,
        id: `${showId}-next`,
        seasonNumber: index < 3 ? 1 : 2,
        episodeNumber: index === 0 ? 1 : index + 2,
        airsAt: nextAirsAt,
        kind: index === 0 ? ("series-premiere" as const) : index === 3 ? ("season-premiere" as const) : ("episode" as const),
      },
    ];
  });
}

