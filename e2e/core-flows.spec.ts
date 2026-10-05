import { expect, test } from "@playwright/test";
import { mediaTitles } from "../data/media";

test("mobile navigation exposes the product routes", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Open menu" }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation.getByRole("link", { name: "Calendar", exact: true })).toBeVisible();
  await navigation.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole("heading", { name: "Explore premieres" })).toBeVisible();
  await expect(navigation).not.toBeVisible();
});

test("discovery applies filters and displays verified cards", async ({ page }) => {
  await page.route("**/api/browse?**", (route) => route.fulfill({
    json: {
      results: [{ title: mediaTitles[0], date: "2026-10-04", season: 1, nextEpisodeDate: null, rating: 9.2, popularity: 99 }],
      totalResults: 1, totalPages: 1, page: 1, hasMore: false, snapshot: "0123456789abcdef",
      coverage: { configured: true, verifiedTitles: 1, candidateTitles: 1, unavailableTitles: 0, updatedAt: "2026-10-05" },
    },
  }));
  await page.goto("/explore");
  await expect(page.locator("article").first()).toBeVisible();
  await page.getByLabel("Sort results", { exact: true }).selectOption("title");
  await expect(page.getByText("Changes ready to apply")).toBeVisible();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/sort=title/);
  await expect(page.getByRole("status")).toContainText("Title A–Z");
  await expect(page.locator("article").first()).toContainText("Echoes of Orion");
});

test("saving a show updates all copies and portable tracker data", async ({ page }) => {
  await page.goto("/");
  const add = page.getByRole("button", { name: /^Add .* to My Countdowns$/ }).first();
  const label = await add.getAttribute("aria-label");
  await add.click();
  const title = label!.replace(/^Add /, "").replace(/ to My Countdowns$/, "");
  await expect(page.getByRole("button", { name: `Remove ${title} from My Countdowns` }).first()).toHaveAttribute("aria-pressed", "true");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("cinecount-tracker-v1") ?? "{}") as { watchlistIds?: string[] });
  expect(stored.watchlistIds?.length).toBe(1);
  await expect(page.getByRole("button", { name: "In My Countdowns" })).toHaveAttribute("aria-pressed", "true");
});

test("schedule dashboard opens an episode countdown detail", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Trending TV Shows" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upcoming TV Shows" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Airing Soon", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Explore the show" }).click();
  await expect(page).toHaveURL(/\/show\/\d+\//);
  await expect(page.getByText("Countdown to release")).toBeVisible();
  expect(errors).toEqual([]);
});

test("private tracking routes keep their sign-in requirement", async ({ page }) => {
  await page.goto("/watchlist");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Good to have you here." })).toBeVisible();
});

test("search contains keyboard focus and restores it on dismissal", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open search" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Search titles" });
  await expect(dialog).toBeVisible();
  const input = dialog.getByLabel("Search titles, genres, or platforms");
  await expect(input).toBeFocused();
  await input.fill("Echoes");
  await expect(dialog.getByRole("link", { name: /Echoes of Orion/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("both themes and reduced motion remain usable on a small viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Theme: system. Change theme" }).click();
  await page.getByRole("button", { name: "Theme: dark. Change theme" }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.getByRole("button", { name: "Open search" }).evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.01);
});
