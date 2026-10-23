import { expect, test } from "@playwright/test";
import { getTrackerStorageKey } from "../lib/tracker";

test("search combines Western and Asian titles and survives one provider failing", async ({ request, page }) => {
  const response = await request.get("/api/search?q=Orion");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.partial).toBe(false);
  expect(body.results.map((title: { title: string }) => title.title)).toEqual(expect.arrayContaining(["Echoes of Orion", "Orion Love"]));
  await page.goto("/search?q=Echoes%20of%20Orion");
  await expect(page.getByRole("heading", { name: "Echoes of Orion", exact: true })).toBeVisible();
  await expect(page.getByText(/Some results are temporarily unavailable/)).toBeVisible();
});

test("Asian titles support search, details, saving, episode progress, reload, sharing and date-only calendar entries", async ({ page, request }) => {
  const id = "mdl-729705-hidden-love";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/search?q=偷偷藏不住");
  await page.getByRole("link", { name: "View Hidden Love details" }).click();
  await expect(page).toHaveURL(new RegExp(`/title/${id}$`));
  await expect(page.getByRole("heading", { name: "Hidden Love", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Title information from MyDramaList" })).toHaveAttribute("href", "https://mydramalist.com/729705-hidden-love");
  await page.getByRole("button", { name: "Add to watchlist", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved to watchlist", exact: true })).toHaveAttribute("aria-pressed", "true");
  const episode = page.locator("article").filter({ has: page.getByRole("heading", { name: "Hidden Love Episode 1" }) });
  await episode.getByRole("button", { name: "Mark watched", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Saved to watchlist", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(episode.getByRole("button", { name: "Watched", exact: true })).toHaveAttribute("aria-pressed", "true");
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), getTrackerStorageKey(null));
  expect(stored.watchlistIds).toContain(id);
  expect(stored.episodeProgress[id]).toEqual(["s1e1"]);
  await page.goto(`/shared?ids=${id}`);
  await expect(page.getByRole("heading", { name: "Hidden Love", exact: true })).toBeVisible();
  const calendar = await (await request.get(`/api/calendar?ids=${id}`)).json();
  expect(calendar.failedIds).toEqual([]);
  expect(calendar.results[0]).toMatchObject({ title: { id }, episode: { airDate: "2099-03-04", episodeNumber: 2 } });
  expect(errors).toEqual([]);
});
