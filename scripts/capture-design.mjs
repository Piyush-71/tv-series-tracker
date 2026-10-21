// Run against the local app: DESIGN_URL=http://localhost:3101 node scripts/capture-design.mjs
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.DESIGN_URL ?? "http://localhost:3101";
const theme = process.env.DESIGN_THEME ?? "dark";
const output = path.resolve("docs/design");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  colorScheme: theme,
  reducedMotion: "reduce",
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
async function ready() {
  await page
    .getByRole("button", { name: "Open search", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => !document.querySelector('button[aria-label="Open search"]').disabled,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () =>
      [...document.images]
        .filter((image) => {
          const rect = image.getBoundingClientRect();
          return rect.top < innerHeight && rect.bottom > 0;
        })
        .every((image) => image.complete && image.naturalWidth > 0),
    null,
    { timeout: 30000 },
  );
  // Hide only the development overlay, not application content.
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) throw new Error(`Horizontal overflow: ${page.url()}`);
}
try {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await ready();
  await page.screenshot({ path: path.join(output, "desktop-home.png") });
  await page
    .getByRole("link", { name: "Explore the show", exact: true })
    .click();
  await page.waitForURL("**/show/**");
  await page.getByText("Countdown to release", { exact: true }).waitFor();
  await ready();
  await page.screenshot({ path: path.join(output, "desktop-show.png") });
  await page.goto(`${baseURL}/soon`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "Airing Soon" }).waitFor();
  await page.locator("article").first().waitFor();
  await ready();
  await page.screenshot({ path: path.join(output, "desktop-schedule.png") });
  await page.setViewportSize({ width: 375, height: 1400 });
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await ready();
  await page.screenshot({ path: path.join(output, "mobile-home.png") });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Airing Soon", exact: true })
    .click();
  await page.waitForURL("**/soon");
  await page.goto(`${baseURL}/soon`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "Airing Soon" }).waitFor();
  await page.locator("article").first().waitFor();
  await ready();
  await page.screenshot({ path: path.join(output, "mobile-schedule.png") });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    `Five screenshots saved to ${output}; no overflow or page errors.`,
  );
} finally {
  await browser.close();
}
