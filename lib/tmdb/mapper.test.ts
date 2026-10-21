import { describe, expect, it } from "vitest";
import { parseTmdbSlug, toMediaTitle } from "@/lib/tmdb/mapper";
import type { TmdbDetails } from "@/lib/tmdb/types";

describe("TMDB title mapping", () => {
  it.each([undefined, ""])("preserves a missing release date (%s) instead of making it today", (date) => {
    expect(toMediaTitle({ id: 42, title: "Unannounced", release_date: date }, new Map(), "movie").releaseDate).toBe("");
    expect(toMediaTitle({ id: 43, name: "Unannounced", first_air_date: date }, new Map(), "tv").releaseDate).toBe("");
  });

  it("exposes tracker-ready TV metadata and preserves date-only precision", () => {
    const details: TmdbDetails = {
      id: 42,
      name: "Signal House",
      overview: "A worked mapping example.",
      first_air_date: "2026-09-18",
      poster_path: "/poster.jpg",
      backdrop_path: "/backdrop.jpg",
      vote_average: 8.25,
      popularity: 91,
      genres: [{ id: 18, name: "Drama" }],
      original_language: "ko",
      origin_country: ["KR"],
      status: "Returning Series",
      number_of_seasons: 2,
      number_of_episodes: 16,
      episode_run_time: [54],
      created_by: [{ id: 3, name: "Min Park" }],
      next_episode_to_air: {
        id: 4203,
        name: "The Relay",
        overview: "Signals cross.",
        air_date: "2026-09-25",
        episode_number: 3,
        season_number: 1,
        runtime: 56,
        still_path: "/still.jpg",
        vote_average: 8.1,
      },
      "watch/providers": {
        results: {
          US: {
            link: "https://www.themoviedb.org/tv/42/watch",
            flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg" }],
          },
        },
      },
    };

    expect(toMediaTitle(details, new Map(), "tv")).toMatchObject({
      id: "tv-42",
      releasePrecision: "date",
      originalLanguage: "ko",
      originCountries: ["KR"],
      status: "Returning Series",
      seasonCount: 2,
      episodeCount: 16,
      runtime: 54,
      creators: ["Min Park"],
      providerLink: "https://www.themoviedb.org/tv/42/watch",
      providers: [{ id: 8, name: "Netflix" }],
      nextEpisode: { seasonNumber: 1, episodeNumber: 3, name: "The Relay" },
    });
  });
});

describe("TMDB identity parsing", () => {
  it.each(["tv-nope", "movie-0", "tv--1", "movie-42-extra", "tv-1.5", "tv-9007199254740992"])("rejects invalid identity %s", (slug) => {
    expect(parseTmdbSlug(slug)).toBeNull();
  });

  it("preserves stable movie and TV IDs", () => {
    expect(parseTmdbSlug("tv-42")).toEqual({ mediaType: "tv", id: "42" });
    expect(parseTmdbSlug("movie-43")).toEqual({ mediaType: "movie", id: "43" });
  });
});
