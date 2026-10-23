import { describe, expect, it } from "vitest";
import { mapMdlDetails, mapMdlEpisodes, mapMdlSearch, mdlDate, mdlImage } from "./mapper";
import { parseMdlSlug } from "./identity";

const search = { slug: "729705-hidden-love", title: "Hidden Love", type: "Chinese Drama", year: 2023, rating: 9, series: "25 episodes", thumb: "https://i.mydramalist.com/poster.jpg" };
const details = { data: {
  title: "Hidden Love (2023)", year: "2023", rating: 9, poster: search.thumb, synopsis: "A drama.",
  details: { country: "China", type: "Drama", episodes: "25", aired: "Jun 20, 2023 - Jul 6, 2023", duration: "45 min.", original_network: "Youku" },
  others: { genres: ["Romance"], director: ["Gia Lee"] }, casts: [{ name: "Zhao Lu Si", profile_image: search.thumb }],
} };

describe("MyDramaList domain mapping", () => {
  it("keeps a durable provider-specific slug, country, format, episode count and a year without inventing a day", () => {
    expect(mapMdlSearch(search)).toMatchObject({ id: "mdl-729705-hidden-love", slug: "mdl-729705-hidden-love", type: "tv", originCountries: ["CN"], releaseYear: 2023, releaseDate: "", episodeCount: 25 });
    expect(mapMdlSearch({ ...search, type: "Chinese Movie" })?.type).toBe("movie");
    expect(mapMdlSearch({ ...search, year: null })).toMatchObject({ releaseDate: "", releaseYear: undefined });
  });

  it("validates identities and image hosts before they enter links or Next Image", () => {
    expect(parseMdlSlug("mdl-729705-hidden-love")).toBe("729705-hidden-love");
    for (const slug of ["729705-hidden-love", "mdl-0-show", "mdl-42-../secret", "mdl-42-show?url=evil", "mdl-42-show/cast"]) expect(parseMdlSlug(slug)).toBeNull();
    expect(mapMdlSearch({ ...search, slug: "../../evil" })).toBeNull();
    expect(mdlImage("https://evil.example/poster.jpg")).toBe("/icon.svg");
    expect(mdlImage("javascript:alert(1)")).toBe("/icon.svg");
    expect(mdlImage(search.thumb)).toBe(search.thumb);
  });

  it("maps real detail envelopes and fails explicitly on empty scraper output", () => {
    expect(mapMdlDetails(details, search.slug)).toMatchObject({ title: "Hidden Love", releaseDate: "2023-06-20", runtime: 45, seasonCount: 1, episodeCount: 25, genres: ["Romance"], platform: "Youku", cast: [{ name: "Zhao Lu Si", role: "Cast", image: search.thumb }] });
    expect(() => mapMdlDetails({}, search.slug)).toThrow("incomplete");
    expect(mapMdlDetails({ data: { ...details.data, details: { ...details.data.details, aired: "2027", duration: "1 hr. 20 min." } } }, search.slug)).toMatchObject({ releaseDate: "", runtime: 80 });
  });

  it.each(["2027", "TBA", "Feb 30, 2024", "2024-02-30", ""])('does not turn uncertain/invalid date "%s" into a release date', (value) => {
    expect(mdlDate(value)).toBe("");
  });

  it("maps episode identities, skips malformed rows and retains unknown airdates", () => {
    const rows = mapMdlEpisodes({ data: { episodes: [
      { title: "Show Episode 2", link: "https://mydramalist.com/42-show/episode/2", air_date: "Apr 09, 2024", rating: "8.4/10 from 200 users" },
      { title: "Show Episode 1", air_date: "TBA" },
      { title: "Unnumbered special" },
    ] } });
    expect(rows.map((episode) => episode.id)).toEqual(["s1e1", "s1e2"]);
    expect(rows[0].airDate).toBeUndefined();
    expect(rows[1]).toMatchObject({ airDate: "2024-04-09", rating: 8.4, seasonNumber: 1, episodeNumber: 2 });
    expect(() => mapMdlEpisodes({})).toThrow("incomplete");
  });
});
