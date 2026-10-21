import { NextResponse } from "next/server";
import { getTitleBySlug } from "@/lib/tmdb/service";
import { getScheduledShowsByTrackerIds } from "@/lib/schedule";
import { getRequestKey, publicApiLimiter } from "@/lib/api";
import type { MediaEpisode } from "@/types/media";
import type { ShowSchedule } from "@/types/schedule";

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
  let scheduleFailed = false;
  const schedules = await getScheduledShowsByTrackerIds(ids).catch(() => {
    scheduleFailed = true;
    return [];
  });
  const byId = new Map(schedules.map(({ id, show }) => [id, show]));
  function scheduledEntry(id: string, show: ShowSchedule): CalendarEntry {
    const next = show.next!;
    return {
      href: `/show/${show.showId}/${show.slug}`,
      title: { id, slug: show.slug, title: show.title, poster: show.poster },
      episode: {
        id: next.id, name: `Episode ${next.episodeNumber}`, overview: "",
        airDate: next.airsAt, seasonNumber: next.seasonNumber,
        episodeNumber: next.episodeNumber, rating: 0,
      },
    };
  }
  const simklIds = ids.filter((id) => id.startsWith("simkl-"));
  for (const id of simklIds) {
    const show = byId.get(id);
    if (!show) (scheduleFailed ? failedIds : unresolvedIds).push(id);
    else if (!show.next) noEpisodeIds.push(id);
    else results.push(scheduledEntry(id, show));
  }

  const tvIds = ids.filter((id) => id.startsWith("tv-"));
  let cursor = 0;
  // Avoid a 25-way fan-out: title details may themselves make several requests.
  await Promise.all(
    Array.from({ length: Math.min(4, tvIds.length) }, async () => {
      while (cursor < tvIds.length) {
        const id = tvIds[cursor++];
        const show = byId.get(id);
        if (show?.next) {
          results.push(scheduledEntry(id, show));
          continue;
        }
        try {
          const title = await getTitleBySlug(id);
          if (!title) {
            unresolvedIds.push(id);
            continue;
          }
          if (!title.nextEpisode) {
            (scheduleFailed ? failedIds : noEpisodeIds).push(id);
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
