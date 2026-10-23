import { expect, test } from "@playwright/test";

test.use({ timezoneId: "UTC" });

const filters = [
  { label: "Country", all: "All countries", param: "country", values: ["US", "IN"] },
  { label: "Language", all: "All languages", param: "language", values: ["en", "hi"] },
  { label: "Genre", all: "All genres", param: "genre", values: ["Drama", "Comedy"] },
];

for (const mobile of [false, true]) {
  test.describe(`Explore dropdowns on ${mobile ? "mobile" : "desktop"}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(mobile
        ? { width: 375, height: 812 }
        : { width: 1440, height: 900 });
      await page.route("**/api/browse?**", (route) => route.fulfill({ json: {
        results: [], totalResults: 0, totalPages: 0, page: 1, hasMore: false,
        snapshot: "0123456789abcdef",
        coverage: { configured: true, verifiedTitles: 0, candidateTitles: 0,
          unavailableTitles: 0, updatedAt: "2026-10-24" },
      } }));
    });

    for (const filter of filters) {
      test(`${filter.label} options scroll without dismissing the dropdown`, async ({ page }) => {
        await page.goto("/explore");
        await expect(page.getByRole("button", { name: "Open search", exact: true })).toBeEnabled();
        await expect(page.getByRole("button", { name: "Apply filters", exact: true })).toBeEnabled();
        if (mobile) await page.getByRole("button", { name: "Filters", exact: true }).click();
        await page.getByRole("button", { name: filter.all, exact: true }).click();
        const picker = page.getByRole("dialog", { name: `Choose ${filter.label.toLowerCase()}` });
        const list = picker.getByRole("group", { name: filter.label, exact: true });
        expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
        await list.hover();
        const pageScroll = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, 300);
        await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        await expect(picker).toBeVisible();
        expect(await page.evaluate(() => scrollY)).toBe(pageScroll);
        await list.evaluate((element) => { element.scrollTop = element.scrollHeight; });
        const lastOption = list.getByRole("checkbox").last();
        await expect(lastOption).toBeInViewport();
        await lastOption.check();
        await expect(lastOption).toBeChecked();
        await expect(picker.getByRole("textbox")).toBeVisible();
        await picker.getByRole("button", { name: `Close ${filter.label.toLowerCase()}` }).click();
        await page.getByRole("button", { name: `${filter.label} (1)`, exact: true }).click();
        await expect(picker.getByRole("textbox")).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(picker).not.toBeVisible();
        await expect(page.getByRole("button", { name: `${filter.label} (1)`, exact: true })).toBeFocused();
      });

      test(`clears only ${filter.label} selections and preserves other filters`, async ({ page }) => {
        const params = new URLSearchParams({ q: "story", range: "upcoming", sort: "rating" });
        for (const item of filters) {
          for (const value of item.values) params.append(item.param, value);
        }
        await page.goto(`/explore?${params}`);
        await expect(page.getByRole("button", { name: "Open search", exact: true })).toBeEnabled();
        await expect(page.getByRole("button", { name: "Apply filters", exact: true })).toBeEnabled();
        if (mobile) await page.getByRole("button", { name: /^Filters \(/ }).click();
        await page.getByRole("button", { name: `${filter.label} (2)`, exact: true }).click();
        const picker = page.getByRole("dialog", { name: `Choose ${filter.label.toLowerCase()}` });
        const search = picker.getByRole("textbox");
        await search.fill("no matching option");
        await picker.getByRole("button", { name: `Clear ${filter.label.toLowerCase()} filter` }).click();
        await expect(picker).toBeVisible();
        await expect(search).toHaveValue("");
        await expect(search).toBeFocused();
        await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(0);
        await expect(picker.getByRole("button", { name: `Clear ${filter.label.toLowerCase()} filter` })).toBeDisabled();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("button", { name: filter.all, exact: true })).toBeFocused();
        const form = mobile
          ? page.getByRole("dialog", { name: "Explore filters", exact: true })
          : page.getByRole("form", { name: "Explore filters", exact: true });
        await form.getByRole("button", { name: "Apply filters", exact: true }).click();
        await expect.poll(() => new URL(page.url()).searchParams.getAll(filter.param)).toEqual([]);
        const applied = new URL(page.url()).searchParams;
        for (const other of filters.filter((item) => item !== filter)) {
          expect(applied.getAll(other.param)).toEqual(other.values);
        }
        expect(applied.get("q")).toBe("story");
        expect(applied.get("range")).toBe("upcoming");
        expect(applied.get("sort")).toBe("rating");
        await page.reload();
        await expect(page.getByRole("button", { name: "Open search", exact: true })).toBeEnabled();
        if (mobile) await page.getByRole("button", { name: /^Filters \(/ }).click();
        await expect(page.getByRole("button", { name: filter.all, exact: true })).toBeVisible();
      });
    }
  });
}
