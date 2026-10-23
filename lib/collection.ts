import { mediaTitles } from "@/data/media";
import { getScheduledShowsByTrackerIds } from "@/lib/schedule";
import { getTitleBySlug } from "@/lib/catalog";
import { parseMdlSlug } from "@/lib/kuryana/identity";
import type { CollectionEntry } from "@/types/collection";
import type { MediaTitle } from "@/types/media";
import type { ScheduledEpisode } from "@/types/schedule";
import { withScheduledNextEpisode } from "@/lib/tracker-reminders";

export const collectionBatchSize = 25;

type CollectionSource = {
  title(slug: string): Promise<MediaTitle | undefined>;
  schedule(ids: string[]): Promise<Array<{ id: string; episode: ScheduledEpisode }>>;
};

/** Resolve identities, never membership in a changing discovery selection. */
export function createCollectionResolver(source: CollectionSource) {
  return async (ids: string[]): Promise<CollectionEntry[]> => {
    const wanted = [...new Set(ids)];
    let scheduleFailed = false;
    const schedule = wanted.some((id) => /^(tv|simkl)-\d+$/.test(id))
      ? await source.schedule(wanted).catch(() => { scheduleFailed = true; return []; })
      : [];
    const episodes = new Map(schedule.map(({ id, episode }) => [id, episode]));
    const results: CollectionEntry[] = new Array(wanted.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(4, wanted.length) }, async () => {
      while (cursor < wanted.length) {
        const index = cursor++;
        const id = wanted[index];
        const episode = episodes.get(id);
        try {
          if (/^simkl-\d+$/.test(id)) {
            if (episode) { results[index] = { id, status: "ready", episode }; continue; }
            results[index] = { id, status: scheduleFailed ? "unavailable" : "missing" };
            continue;
          }
          const fixture = mediaTitles.find((title) => title.id === id);
          if (!fixture && !/^(tv|movie)-\d+$/.test(id) && !parseMdlSlug(id)) {
            results[index] = { id, status: "unsupported" };
            continue;
          }
          const title = await source.title(fixture?.slug ?? id);
          results[index] = title || episode
            ? { id, status: "ready", title: title ? withScheduledNextEpisode(title, episode) : undefined, episode }
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
  schedule: async (ids) => (await getScheduledShowsByTrackerIds(ids)).flatMap(({ id, show }) => {
    const episode = show.next ?? show.previous ?? show.premiere;
    return episode ? [{ id, episode }] : [];
  }),
});
