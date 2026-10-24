import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { mediaTitles } from "@/data/media";
import { WatchlistClient } from "./watchlist-client";

vi.mock("@/hooks/use-watchlist", () => ({
  useWatchlist: () => ({ ids: ["tv-999"], has: () => true, toggle: vi.fn() }),
}));
vi.mock("@/components/tracker/notify-button", () => ({
  NotifyButton: () => null,
}));
vi.mock("@/hooks/use-tracker", () => ({
  useTracker: () => ({
    data: { preferences: { timeZone: "UTC" }, releaseOverrides: {} },
  }),
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("resolves a saved title even when it is absent from discovery and the schedule", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: "tv-999",
            status: "ready",
            title: {
              ...mediaTitles[0],
              id: "tv-999",
              title: "Saved outside discovery",
            },
          },
        ],
      }),
    }),
  );
  render(<WatchlistClient />);
  expect(await screen.findByText("Saved outside discovery")).toBeTruthy();
  expect(screen.queryByText("My Countdowns is waiting.")).toBeNull();
});

it("renders a title with a schedule once and filters without losing the saved entry", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: "tv-999",
            status: "ready",
            title: { ...mediaTitles[0], id: "tv-999", title: "One show" },
            episode: {
              id: "episode-1",
              showId: "999",
              tmdbId: "999",
              title: "One show",
              slug: "one-show",
              poster: mediaTitles[0].poster,
              seasonNumber: 2,
              episodeNumber: 3,
              airsAt: "2099-04-05",
              precision: "date",
              kind: "episode",
              sourceUrl: "",
            },
          },
        ],
      }),
    }),
  );
  render(<WatchlistClient />);
  await screen.findByRole("heading", { name: "One show" });
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.queryByRole("timer")).toBeNull();
  expect(screen.getByText("Releases Apr 5, 2099")).toBeDefined();
  fireEvent.click(
    screen.getByRole("button", { name: "Date TBA" }),
  );
  expect(
    screen.getByRole("heading", { name: "No matching titles" }),
  ).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "Search your titles" }),
    { target: { value: "missing" } },
  );
  expect(screen.queryAllByRole("article")).toHaveLength(0);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Search your titles" }),
    { target: { value: "one" } },
  );
  expect(screen.getAllByRole("article")).toHaveLength(1);
});
