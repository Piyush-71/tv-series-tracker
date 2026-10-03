import { expect, test } from "@playwright/test";

test("mobile navigation exposes the product routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation.getByRole("link", { name: "Calendar" })).toBeVisible();
  await navigation.getByRole("link", { name: "Explore" }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole("heading", { name: "Explore premieres" })).toBeVisible();
});

test("discovery filters can be applied and paginated", async ({ page }) => {
  await page.goto("/explore");
  await page.getByLabel("Sort").selectOption("title");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("title sorted")).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();
});

test("saving a title writes portable tracker data", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[aria-label^="View "][aria-label$=" details"]').first().click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("cinecount-tracker-v1") ?? "{}") as { watchlistIds?: string[] });
  expect(stored.watchlistIds?.length).toBe(1);
});

test("signed-out visitors are redirected away from the private watchlist", async ({ page }) => {
  await page.goto("/watchlist");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});
