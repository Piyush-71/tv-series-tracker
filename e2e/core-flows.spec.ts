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

test("Explore displays matches before optional card details finish", async ({ page }) => {
  let releaseDetails!: () => void;
  const detailsReady = new Promise<void>((resolve) => { releaseDetails = resolve; });
  await page.route("**/api/browse?**", async (route) => {
    const details = new URL(route.request().url()).searchParams.get("details") === "1";
    if (details) await detailsReady;
    await route.fulfill({ json: {
      detailsPending: !details,
      results: [{ title: { ...mediaTitles[0], originCountries: details ? ["IN"] : [] }, date: "2099-01-01", season: 1, nextEpisodeDate: null, rating: 8, popularity: 99, detailsPending: !details }],
      totalResults: 1, totalPages: 1, page: 1, hasMore: false, snapshot: "0123456789abcdef",
      coverage: { configured: true, verifiedTitles: 1, candidateTitles: 1, unavailableTitles: 0, updatedAt: "2026-10-21" },
    } });
  });
  await page.goto("/explore?range=upcoming");
  await expect(page.locator("article")).toContainText("Echoes of Orion");
  await expect(page.locator("article")).toContainText("Loading origin…");
  await expect(page.getByRole("button", { name: "Apply filters", exact: true })).toBeEnabled();
  releaseDetails();
  await expect(page.locator("article")).toContainText("India");
  await expect(page.locator("article")).not.toContainText("Loading origin…");
});

test("upcoming dates survive content switches, reloads, and Back navigation", async ({ page }) => {
  await page.route("**/api/browse?**", (route) => {
    const movie = new URL(route.request().url()).searchParams.get("type") === "movie";
    return route.fulfill({ json: {
      results: [{ title: { ...mediaTitles[0], type: movie ? "movie" : "tv" }, date: "2099-01-01", season: movie ? null : 1, nextEpisodeDate: null, rating: null, popularity: 99 }],
      totalResults: 1, totalPages: 1, page: 1, hasMore: false, snapshot: "0123456789abcdef",
      coverage: { configured: true, verifiedTitles: 1, candidateTitles: 1, unavailableTitles: 0, limited: true, unavailablePages: 1, updatedAt: "2026-10-20" },
    } });
  });
  await page.goto("/explore");
  await expect(page.getByRole("button", { name: "Apply filters", exact: true })).toBeEnabled();
  await page.getByLabel("Premiere-date range").selectOption("upcoming");
  await expect(page.getByLabel("Sort results")).toHaveValue("oldest");
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page.locator("article")).toContainText("Premieres Jan 1, 2099");
  await page.getByRole("button", { name: "Movies", exact: true }).click();
  await expect(page.getByLabel("Release-date range")).toHaveValue("upcoming");
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page.locator("article")).toContainText("Releases Jan 1, 2099");
  await expect(page.getByRole("status")).toContainText("Soonest release");
  await expect(page.getByText(/A discovery limit was reached/)).toBeVisible();
  await expect(page.getByText(/1 discovery page could not be loaded/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Release-date range")).toHaveValue("upcoming");
  await page.goBack();
  await expect(page.getByLabel("Premiere-date range")).toHaveValue("upcoming");
  await expect(page.locator("article")).toContainText("Premieres Jan 1, 2099");
});

for (const mobile of [false, true]) {
  for (const mode of ["tv", "movie"]) {
    test(`language filters apply and persist for ${mode} on ${mobile ? "mobile" : "desktop"}`, async ({ page }) => {
      if (mobile) await page.setViewportSize({ width: 375, height: 812 });
      await page.route("**/api/browse?**", (route) => route.fulfill({
        json: {
          results: [], totalResults: 0, totalPages: 0, page: 1, hasMore: false, snapshot: "0123456789abcdef",
          coverage: { configured: true, verifiedTitles: 0, candidateTitles: 0, unavailableTitles: 0, updatedAt: "2026-10-18" },
        },
      }));
      await page.goto(`/explore?type=${mode}`);
      await expect(page.getByRole("button", { name: "Apply filters", exact: true })).toBeEnabled();
      if (mobile) await page.getByRole("button", { name: "Filters", exact: true }).click();
      await page.getByRole("button", { name: "All languages", exact: true }).click();
      const picker = page.getByRole("dialog", { name: "Choose language", exact: true });
      await expect(picker.getByRole("textbox", { name: "Find language" })).toBeFocused();
      await picker.getByRole("textbox", { name: "Find language" }).fill("Hindi");
      await picker.getByRole("checkbox", { name: "Hindi", exact: true }).check();
      await picker.getByRole("textbox", { name: "Find language" }).fill("Tamil");
      await picker.getByRole("checkbox", { name: "Tamil", exact: true }).check();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Language (2)", exact: true })).toBeFocused();
      const appliedRequest = page.waitForRequest((request) => request.url().includes("/api/browse?") && new URL(request.url()).searchParams.getAll("language").length === 2);
      const form = mobile ? page.getByRole("dialog", { name: "Explore filters", exact: true }) : page.getByRole("form", { name: "Explore filters", exact: true });
      await form.getByRole("button", { name: "Apply filters", exact: true }).click();
      expect(new URL((await appliedRequest).url()).searchParams.getAll("language")).toEqual(["hi", "ta"]);
      await expect(page.getByRole("button", { name: "Remove filter Language: Hindi", exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("button", { name: "Remove filter Language: Tamil", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Remove filter Language: Hindi", exact: true }).click();
      await expect.poll(() => new URL(page.url()).searchParams.getAll("language")).toEqual(["ta"]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

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
  const input = dialog.getByLabel("Search titles", { exact: true });
  await expect(input).toBeFocused();
  await input.fill("Echoes");
  await expect(dialog.getByRole("status")).toHaveText("1 titles found");
  await expect(dialog.getByRole("link", { name: /Echoes of Orion/ })).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Close search" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("link", { name: /Echoes of Orion/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close search" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
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
