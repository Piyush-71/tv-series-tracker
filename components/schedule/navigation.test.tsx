import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScheduleCard } from "@/components/schedule/schedule-card";
import { ScheduleDashboard } from "@/components/schedule/schedule-dashboard";
import type { ScheduledEpisode } from "@/types/schedule";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/hooks/use-watchlist", () => ({
  useWatchlist: () => ({ has: () => false, toggle: vi.fn(), isReady: true }),
}));
vi.mock("@/components/schedule/airtime", () => ({ Airtime: () => null }));
vi.mock("@/components/schedule/schedule-countdown", () => ({ ScheduleCountdown: () => null }));
vi.mock("@/components/schedule/timezone-status", () => ({ TimezoneStatus: () => null }));
vi.mock("@/components/schedule/follow-show-button", () => ({ FollowShowButton: () => null }));

const episode: ScheduledEpisode = {
  id: "episode-1", showId: "2693509", tmdbId: "259909",
  title: "Dexter: Resurrection", slug: "dexter-resurrection", poster: "/poster.jpg",
  seasonNumber: 2, episodeNumber: 1, airsAt: "2099-11-02T01:00:00Z",
  precision: "datetime", kind: "season-premiere", sourceUrl: "https://simkl.com/tv/2693509",
};

afterEach(cleanup);

describe("Discover title navigation", () => {
  it("opens full title details from both the card poster and title", () => {
    render(<ScheduleCard episode={episode} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    for (const link of links) expect(link.getAttribute("href")).toBe("/title/tv-259909");
    expect(screen.getByRole("link", { name: "Open Dexter: Resurrection details" })).toBeTruthy();
  });

  it("uses full title details for the featured show, next rail, and every dashboard card", () => {
    render(<ScheduleDashboard dashboard={{ trending: [episode], upcoming: [episode], airingSoon: [episode] }} />);
    const links = screen.getAllByRole("link").filter((link) =>
      link.textContent?.includes(episode.title) || link.textContent?.includes("Explore the show") || link.getAttribute("aria-label")?.includes(episode.title),
    );
    expect(links).toHaveLength(8);
    for (const link of links) expect(link.getAttribute("href")).toBe("/title/tv-259909");
  });

  it("keeps shows without a TMDB identity accessible through their schedule", () => {
    render(<ScheduleCard episode={{ ...episode, tmdbId: undefined }} />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toBe("/show/2693509/dexter-resurrection");
    }
  });
});
