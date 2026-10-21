import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CollectionGrid } from "./collection-grid";

const toggle = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-watchlist", () => ({ useWatchlist: () => ({ has: (id: string) => id === "simkl-77", toggle }) }));
vi.mock("@/components/schedule/schedule-countdown", () => ({ ScheduleCountdown: () => null }));
vi.mock("@/components/schedule/airtime", () => ({ Airtime: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(() => { cleanup(); toggle.mockReset(); });

it("removes the original saved Simkl identity after the show gains a TMDB mapping", () => {
  const episode = { id: "next", showId: "77", tmdbId: "42", title: "Mapped show", slug: "mapped", poster: "/poster.jpg", seasonNumber: 2, episodeNumber: 1, airsAt: "2099-01-01T00:00:00Z", precision: "datetime" as const, kind: "episode" as const, sourceUrl: "https://simkl.com/tv/77" };
  render(<CollectionGrid entries={[{ id: "simkl-77", status: "ready", episode }]} />);
  const remove = screen.getByRole("button", { name: "Remove Mapped show from My Countdowns" });
  expect(remove.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(remove);
  expect(toggle).toHaveBeenCalledWith("simkl-77");
});
