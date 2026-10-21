import { expect, test } from "@playwright/test";
import { mediaTitles } from "../data/media";

test("shared lists load all identities beyond fifty and preserve unknown release dates", async ({ page }) => {
  const requested: string[][] = [];
  await page.route("**/api/collection", async (route) => {
    const { ids } = route.request().postDataJSON() as { ids: string[] };
    requested.push(ids);
    await route.fulfill({ json: { results: ids.map((id) => ({
      id, status: "ready", title: { ...mediaTitles[0], id, slug: id, title: `Saved ${id}`, releaseDate: "", releasePrecision: "date" },
    })) } });
  });
  const ids = Array.from({ length: 56 }, (_, index) => `tv-${index + 1}`);
  await page.goto(`/shared?ids=${ids.join(",")}`);
  await expect(page.getByText("56 titles shared with you.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved tv-56", exact: true })).toBeVisible();
  await expect(page.locator("main article")).toHaveCount(56);
  await expect(page.locator("main")).not.toContainText("NaN");
  await expect(page.getByText("TBA", { exact: true })).toHaveCount(56);
  expect([...new Set(requested.flat())]).toEqual(ids);
  expect(requested.every((batch) => batch.length <= 25)).toBe(true);
});

test("failed shared-title requests retain entries and recover on retry", async ({ page }) => {
  let unavailable = true;
  await page.route("**/api/collection", async (route) => {
    if (unavailable) return route.fulfill({ status: 502, json: { error: { message: "Temporarily unavailable" } } });
    return route.fulfill({ json: { results: [{ id: "tv-999", status: "ready", title: { ...mediaTitles[0], id: "tv-999", title: "Recovered saved title" } }] } });
  });
  await page.goto("/shared?ids=tv-999");
  await expect(page.getByRole("heading", { name: "Saved title · tv-999" })).toBeVisible();
  await expect(page.getByText("These entries are still saved. Their details could not be loaded.")).toBeVisible();
  unavailable = false;
  await page.getByRole("button", { name: "Retry title details" }).click();
  await expect(page.getByRole("heading", { name: "Recovered saved title" })).toBeVisible();
});
