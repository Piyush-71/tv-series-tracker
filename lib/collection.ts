import { mediaTitles } from "@/data/media";
import { getFollowableSchedule, getShowSchedule } from "@/lib/schedule";
import { getScheduleTrackerId } from "@/lib/schedule/format";
import { getTitleBySlug } from "@/lib/tmdb/service";
import type { CollectionEntry } from "@/types/collection";
import type { MediaTitle } from "@/types/media";
import type { ScheduledEpisode, ShowSchedule } from "@/types/schedule";

export const collectionBatchSize = 25;

type CollectionSource = {
  title(slug: string): Promise<MediaTitle | undefined>;
  show(id: string): Promise<ShowSchedule | undefined>;
  schedule(): Promise<ScheduledEpisode[]>;
};

/** Resolve identities, never membership in a changing discovery selection. */
export function createCollectionResolver(source: CollectionSource) {
  return async (ids: string[]): Promise<CollectionEntry[]> => {
    const wanted = [...new Set(ids)];
    const schedule = wanted.some((id) => /^tv-\d+$/.test(id))
      ? await source.schedule().catch(() => [])
      : [];
    const episodes = new Map(schedule.map((episode) => [getScheduleTrackerId(episode), episode]));
    const results: CollectionEntry[] = new Array(wanted.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(4, wanted.length) }, async () => {
      while (cursor < wanted.length) {
        const index = cursor++;
        const id = wanted[index];
        const episode = episodes.get(id);
        try {
          if (/^simkl-\d+$/.test(id)) {
            const show = await source.show(id.slice(6));
            const scheduled = show?.next ?? show?.previous ?? show?.premiere;
            results[index] = scheduled ? { id, status: "ready", episode: scheduled } : { id, status: "missing" };
            continue;
          }
          const fixture = mediaTitles.find((title) => title.id === id);
          if (!fixture && !/^(tv|movie)-\d+$/.test(id)) {
            results[index] = { id, status: "unsupported" };
            continue;
          }
          const title = await source.title(fixture?.slug ?? id);
          results[index] = title || episode
            ? { id, status: "ready", title, episode }
            : { id, status: "missing" };
        } catch {
          results[index] = episode ? { id, status: "ready", episode } : { id, status: "unavailable" };
        }
      }
    }));
    return results;
  };
}

export const resolveCollection = createCollectionResolver({
  title: getTitleBySlug,
  show: getShowSchedule,
  schedule: getFollowableSchedule,
});
