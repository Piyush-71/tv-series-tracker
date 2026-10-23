import { expect, test } from "@playwright/test";
import { mediaTitles } from "../data/media";
import { getTrackerStorageKey } from "../lib/tracker";

test("a title without TMDB episode metadata can resolve the broadcast date when Notify Me is clicked", async ({
  page,
}) => {
  const title = {
    ...mediaTitles[0],
    id: "tv-88088",
    slug: "tv-88088",
    title: "The Last Drive-in with Joe Bob Briggs",
    type: "tv",
    releaseDate: "2019-03-29",
    nextEpisode: undefined,
  };
  const episode = {
    id: "next",
    showId: "861276",
    tmdbId: "88088",
    title: title.title,
    slug: "the-last-drive-in",
    poster: "/poster.jpg",
    seasonNumber: 39,
    episodeNumber: 1,
    airsAt: "2099-10-24T01:00:00Z",
    precision: "datetime",
    kind: "season-premiere",
    sourceUrl: "https://simkl.com/tv/861276",
  };
  let lookups = 0;
  await page.route("**/api/push", (route) =>
    route.fulfill({ json: { configured: false, publicKey: null } }),
  );
  await page.route("**/api/collection", (route) => {
    lookups++;
    return route.fulfill({
      json: {
        results: [
          {
            id: title.id,
            status: "ready",
            title,
            ...(lookups > 1 ? { episode } : {}),
          },
        ],
      },
    });
  });
  await page.goto("/shared?ids=tv-88088");
  const button = page.getByRole("button", {
    name: `Remind me about ${title.title}`,
  });
  await expect(button).toBeEnabled();
  // Auth hydration may remount the public collection once. Only the explicit
  // click should add a further schedule lookup after the card becomes ready.
  const initialLookups = lookups;
  expect(initialLookups).toBeGreaterThanOrEqual(1);
  await button.click();
  await expect(
    page.getByRole("button", { name: `Cancel reminder for ${title.title}` }),
  ).toBeVisible();
  expect(lookups).toBeGreaterThan(initialLookups);
  const target = await page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key) ?? "{}").reminders?.["tv-88088"]
        ?.releaseDate,
    getTrackerStorageKey(null),
  );
  expect(target).toBe(episode.airsAt);
});
