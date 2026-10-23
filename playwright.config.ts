import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3100";
const externalURL = process.env.PLAYWRIGHT_BASE_URL;
const kuryanaPort = process.env.KURYANA_TEST_PORT ?? "3199";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: externalURL ?? `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL,
      },
    },
  ],
  webServer: externalURL
    ? undefined
    : [{
        command: "node e2e/fixtures/kuryana.mjs",
        url: `http://127.0.0.1:${kuryanaPort}/health`,
        reuseExistingServer: false,
      }, {
        command: `TMDB_API_READ_ACCESS_TOKEN= KURYANA_ENABLED=true KURYANA_BASE_URL=http://127.0.0.1:${kuryanaPort} npm run dev -- --port ${port}`,
        url: `http://localhost:${port}`,
        // The app must use this run's fixture URL, never an unrelated dev server.
        reuseExistingServer: false,
        timeout: 120_000,
      }],
});
