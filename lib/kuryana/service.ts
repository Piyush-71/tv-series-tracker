import { cache } from "react";
import { kuryanaRequest, KuryanaError } from "@/lib/kuryana/client";
import { mapMdlDetails, mapMdlEpisodes, mapMdlSearch, record } from "@/lib/kuryana/mapper";
import { parseMdlSlug } from "@/lib/kuryana/identity";
import type { MediaTitle } from "@/types/media";

export async function searchMdlTitles(query: string): Promise<MediaTitle[]> {
  return kuryanaRequest(`/search/q/${encodeURIComponent(query)}`, (value) => {
    const envelope = record(value);
    const dramas = record(envelope.results).dramas;
    if (envelope.error && envelope.code === 404) return [];
    if (envelope.error || !Array.isArray(dramas)) throw new KuryanaError("MyDramaList search is temporarily unavailable.");
    return dramas.flatMap((item) => { const title = mapMdlSearch(item); return title ? [title] : []; });
  });
}

export const getMdlTitle = cache(async (slug: string) => {
  const raw = parseMdlSlug(slug);
  if (!raw) return undefined;
  return kuryanaRequest(`/id/${raw}`, (value) => mapMdlDetails(value, raw), 3600);
});

export async function getMdlEpisodes(slug: string, season: number) {
  const raw = parseMdlSlug(slug);
  // MDL lists subsequent seasons as separate titles, rather than TMDB seasons.
  if (!raw || season !== 1) return [];
  return kuryanaRequest(`/id/${raw}/episodes`, mapMdlEpisodes, 900);
}
