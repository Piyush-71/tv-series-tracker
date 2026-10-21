import { NextResponse } from "next/server";
import { getTitleBySlug } from "@/lib/tmdb/service";
import { getScheduledShowsByIds } from "@/lib/schedule";
import { getRequestKey, publicApiLimiter } from "@/lib/api";
import type { MediaEpisode } from "@/types/media";

type CalendarEntry = {
  href: string;
  title: { id: string; slug: string; title: string; poster: string };
  episode: MediaEpisode;
};

// Clients send successive batches of at most 25; never silently truncate IDs.
export async function GET(request: Request) {
  const rate = publicApiLimiter.check(getRequestKey(request));
  if (!rate.allowed)
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many calendar requests. Please try again shortly.",
        },
      },
      { status: 429 },
    );
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw ? raw.split(",") : [])];
  if (
    ids.length > 25 ||
    ids.some((id) => !/^(tv|simkl)-[1-9]\d{0,14}$/.test(id))
  ) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_IDS",
          message: "Send at most 25 TV or Simkl IDs per calendar batch.",
        },
      },
      { status: 400 },
    );
  }

  const results: CalendarEntry[] = [];
  const failedIds: string[] = [];
  const unresolvedIds: string[] = [];
  const noEpisodeIds: string[] = [];
  const simklIds = ids.filter((id) => id.startsWith("simkl-"));
  if (simklIds.length) {
    try {
      const shows = await getScheduledShowsByIds(
        simklIds.map((id) => id.slice(6)),
      );
      const byId = new Map(shows.map((show) => [show.showId, show]));
      for (const id of simklIds) {
        const show = byId.get(id.slice(6));
        if (!show) {
          unresolvedIds.push(id);
          continue;
        }
        if (!show.next) {
          noEpisodeIds.push(id);
          continue;
        }
        const next = show.next;
        results.push({
          href: `/show/${show.showId}/${show.slug}`,
          title: {
            id,
            slug: show.slug,
            title: show.title,
            poster: show.poster,
          },
          episode: {
            id: next.id,
            name: `Episode ${next.episodeNumber}`,
            overview: "",
            airDate: next.airsAt,
            seasonNumber: next.seasonNumber,
            episodeNumber: next.episodeNumber,
            rating: 0,
          },
        });
      }
    } catch {
      failedIds.push(...simklIds);
    }
  }

  const tvIds = ids.filter((id) => id.startsWith("tv-"));
  let cursor = 0;
  // Avoid a 25-way fan-out: title details may themselves make several requests.
  await Promise.all(
    Array.from({ length: Math.min(4, tvIds.length) }, async () => {
      while (cursor < tvIds.length) {
        const id = tvIds[cursor++];
        try {
          const title = await getTitleBySlug(id);
          if (!title) {
            unresolvedIds.push(id);
            continue;
          }
          if (!title.nextEpisode) {
            noEpisodeIds.push(id);
            continue;
          }
          results.push({
            href: `/title/${title.slug}`,
            title: {
              id: title.id,
              slug: title.slug,
              title: title.title,
              poster: title.poster,
            },
            episode: title.nextEpisode,
          });
        } catch {
          failedIds.push(id);
        }
      }
    }),
  );
  results.sort(
    (a, b) =>
      (a.episode.airDate ?? "9999").localeCompare(
        b.episode.airDate ?? "9999",
      ) || a.title.id.localeCompare(b.title.id),
  );
  return NextResponse.json({
    results,
    failedIds: failedIds.sort(),
    unresolvedIds: unresolvedIds.sort(),
    noEpisodeIds: noEpisodeIds.sort(),
  });
}
