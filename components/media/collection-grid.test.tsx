import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CollectionGrid } from "./collection-grid";
import { mediaTitles } from "@/data/media";
import { createTrackerData } from "@/lib/tracker";
import { createCollectionResolver } from "@/lib/collection";

const toggle = vi.hoisted(() => vi.fn());
const scheduleReminder = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-tracker", () => ({
  useTracker: () => ({
    data: createTrackerData(),
    isReady: true,
    isCurrentScope: () => true,
    scheduleReminder,
  }),
}));
vi.mock("@/hooks/use-now", () => ({
  useNow: () => Date.parse("2026-10-23T00:00:00Z"),
}));
vi.mock("@/hooks/use-watchlist", () => ({
  useWatchlist: () => ({ has: (id: string) => id === "simkl-77", toggle }),
}));
vi.mock("@/components/schedule/schedule-countdown", () => ({
  ScheduleCountdown: () => null,
}));
vi.mock("@/components/schedule/airtime", () => ({ Airtime: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(() => {
  cleanup();
  toggle.mockReset();
  scheduleReminder.mockReset();
});

it("removes the original saved Simkl identity after the show gains a TMDB mapping", () => {
  const episode = {
    id: "next",
    showId: "77",
    tmdbId: "42",
    title: "Mapped show",
    slug: "mapped",
    poster: "/poster.jpg",
    seasonNumber: 2,
    episodeNumber: 1,
    airsAt: "2099-01-01T00:00:00Z",
    precision: "datetime" as const,
    kind: "episode" as const,
    sourceUrl: "https://simkl.com/tv/77",
  };
  render(
    <CollectionGrid entries={[{ id: "simkl-77", status: "ready", episode }]} />,
  );
  const remove = screen.getByRole("button", {
    name: "Remove Mapped show from My Countdowns",
  });
  expect(remove.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(remove);
  expect(toggle).toHaveBeenCalledWith("simkl-77");
});

it("uses the available schedule for the saved title's bell and countdown when TMDB has no next episode", async () => {
  const title = {
    ...mediaTitles[0],
    id: "tv-88088",
    slug: "tv-88088",
    title: "The Last Drive-in with Joe Bob Briggs",
    type: "tv" as const,
    releaseDate: "2019-03-29",
    nextEpisode: undefined,
  };
  const episode = {
    id: "next",
    showId: "861276",
    tmdbId: "88088",
    title: title.title,
    slug: "the-last-drive-in",
    poster: "/poster.jpg",
    seasonNumber: 39,
    episodeNumber: 1,
    airsAt: "2099-10-24T01:00:00Z",
    precision: "datetime" as const,
    kind: "season-premiere" as const,
    sourceUrl: "https://simkl.com/tv/861276",
  };
  const resolve = createCollectionResolver({
    title: async () => title,
    schedule: async () => [{ id: title.id, episode }],
  });
  render(<CollectionGrid entries={await resolve([title.id])} />);
  const button = screen.getByRole("button", {
    name: `Remind me about ${title.title}`,
  });
  expect(button.hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("timer")).toBeTruthy();
  expect(screen.queryByText("Released Mar 29, 2019")).toBeNull();
  fireEvent.click(button);
  expect(scheduleReminder).toHaveBeenCalledWith(
    expect.objectContaining({
      nextEpisode: expect.objectContaining({ airDate: episode.airsAt }),
    }),
    false,
  );
});
