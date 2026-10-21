import { expect, test } from "@playwright/test";

for (const width of [1440, 375]) {
  test(`built homepage keeps artwork inside its feature at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1100 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText("Your next obsession.On the horizon.");
    // This runs against the served page so stale CSS can fail even when the build succeeds.
    await expect
      .poll(() =>
        page.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue("--accent")
            .trim(),
        ),
      )
      .toBe("#b8a0ff");
    const feature = page.getByRole("region", { name: "Featured episode" });
    await expect(feature).toBeVisible();
    const layout = await feature.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const art = element.querySelector("img")!.getBoundingClientRect();
      const title = document.querySelector("h1")!.getBoundingClientRect();
      return {
        featureBelowHeading: box.top >= title.bottom,
        artworkContained:
          art.left >= box.left - 1 &&
          art.right <= box.right + 1 &&
          art.top >= box.top - 1 &&
          art.bottom <= box.bottom + 1,
        overflow: document.documentElement.scrollWidth > innerWidth,
        headingSize: parseFloat(
          getComputedStyle(document.querySelector("h1")!).fontSize,
        ),
      };
    });
    expect(layout).toMatchObject({
      featureBelowHeading: true,
      artworkContained: true,
      overflow: false,
    });
    expect(layout.headingSize).toBeGreaterThan(40);
  });
}
