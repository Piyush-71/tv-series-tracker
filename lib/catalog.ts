import { cache } from "react";
import { ApiInputError } from "@/lib/api";
import { isKuryanaEnabled } from "@/lib/kuryana/client";
import { parseMdlSlug } from "@/lib/kuryana/identity";
import { getMdlEpisodes, getMdlTitle, searchMdlTitles } from "@/lib/kuryana/service";
import * as tmdb from "@/lib/tmdb/service";
import type { MediaTitle } from "@/types/media";

export type CatalogSearch = { results: MediaTitle[]; partial: boolean };

function normalizeTitle(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** Prefer existing TMDB identities only when every available identity constraint agrees. */
export function mergeSearchTitles(tmdbTitles: MediaTitle[], mdlTitles: MediaTitle[], query = "") {
  const additions: MediaTitle[] = [];
  for (const title of mdlTitles) {
    const matches = tmdbTitles.filter((existing) =>
      normalizeTitle(existing.title) === normalizeTitle(title.title)
      && existing.type === title.type
      && title.releaseYear !== undefined
      && Number(existing.releaseDate.slice(0, 4)) === title.releaseYear
      && title.originCountries?.some((country) => existing.originCountries?.includes(country)),
    );
    // Ambiguous remakes/editions stay separate; never migrate a user's saved identity.
    const editions = mdlTitles.filter((other) =>
      normalizeTitle(other.title) === normalizeTitle(title.title)
      && other.type === title.type && other.releaseYear === title.releaseYear
      && other.originCountries?.some((country) => title.originCountries?.includes(country)),
    );
    if (matches.length !== 1 || editions.length !== 1) additions.push(title);
  }
  // Both providers must be represented in the overlay's first eight results.
  const results = Array.from({ length: Math.max(tmdbTitles.length, additions.length) }, (_, index) =>
    [tmdbTitles[index], additions[index]].filter((item): item is MediaTitle => Boolean(item)),
  ).flat();
  const needle = normalizeTitle(query);
  const relevance = (title: MediaTitle) => {
    const value = normalizeTitle(title.title);
    return !needle ? 0 : value === needle ? 2 : value.startsWith(needle) ? 1 : 0;
  };
  return [...new Map(results.map((item) => [item.id, item])).values()].sort((a, b) => relevance(b) - relevance(a));
}

export async function searchCatalog(query: string): Promise<CatalogSearch> {
  const value = query.trim();
  if (value.length > 100) throw new ApiInputError("Search query is too long");
  if (value.length < 2 || !isKuryanaEnabled()) return { results: await tmdb.searchTitles(value), partial: false };
  const [western, asian] = await Promise.allSettled([tmdb.searchTitles(value), searchMdlTitles(value)]);
  if (western.status === "rejected" && asian.status === "rejected") throw new Error("Title search is temporarily unavailable.");
  const partial = western.status === "rejected" || asian.status === "rejected";
  if (partial) console.warn(JSON.stringify({ event: "catalog.search_partial", tmdb: western.status, mydramalist: asian.status }));
  return {
    results: mergeSearchTitles(western.status === "fulfilled" ? western.value : [], asian.status === "fulfilled" ? asian.value : [], value),
    partial,
  };
}

export const getTitleBySlug = cache(async (slug: string) => {
  if (parseMdlSlug(slug)) {
    const title = await getMdlTitle(slug);
    if (!title || title.type !== "tv") return title;
    // Ancillary episode outages must not hide a valid title or erase saved data.
    const episodes = await getMdlEpisodes(slug, 1).catch(() => []);
    const today = new Date().toISOString().slice(0, 10);
    return { ...title, nextEpisode: episodes.find((episode) => episode.airDate && episode.airDate >= today) };
  }
  return tmdb.getTitleBySlug(slug);
});

export function getSeasonEpisodes(slug: string, season: number) {
  return parseMdlSlug(slug) ? getMdlEpisodes(slug, season) : tmdb.getSeasonEpisodes(slug, season);
}

export async function getSimilarTitles(slug: string) {
  // Keep discovery recommendations independent of the optional scraper's availability.
  if (parseMdlSlug(slug)) return [];
  return tmdb.getSimilarTitles(slug);
}
