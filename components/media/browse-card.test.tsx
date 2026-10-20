import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BrowseCard } from "@/components/media/browse-card";
import { toBrowseRecord } from "@/lib/browse/mapper";
import type { BrowseResult } from "@/lib/browse/types";

vi.mock("@/hooks/use-watchlist", () => ({ useWatchlist: () => ({ has: () => false, toggle: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => null }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-04T01:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function result(type: "tv" | "movie", date: string): BrowseResult {
  const record = toBrowseRecord({ id: 1, name: "Title", title: "Title", first_air_date: date, release_date: date }, new Map(), type);
  return { title: record.title, date, season: type === "tv" ? 1 : null, nextEpisodeDate: null, rating: null, popularity: null };
}

describe("Browse card release wording", () => {
  it.each(["tv", "movie"] as const)("uses future wording for an upcoming %s", (type) => {
    render(<BrowseCard premiere="new" result={result(type, "2099-01-01")} />);
    expect(screen.getByText(type === "tv" ? /Premieres Jan 1, 2099/ : /Releases Jan 1, 2099/)).toBeTruthy();
  });
  it.each(["tv", "movie"] as const)("retains past wording for a past %s", (type) => {
    render(<BrowseCard premiere="new" result={result(type, "2020-01-01")} />);
    expect(screen.getByText(type === "tv" ? /Premiered Jan 1, 2020/ : /Released Jan 1, 2020/)).toBeTruthy();
  });
  it("uses the viewer's calendar day for a date-only premiere today", () => {
    const view = render(<BrowseCard premiere="new" timeZone="America/Los_Angeles" result={result("tv", "2026-10-03")} />);
    expect(screen.getByText("Premieres Oct 3, 2026")).toBeTruthy();
    view.rerender(<BrowseCard premiere="new" timeZone="UTC" result={result("tv", "2026-10-03")} />);
    expect(screen.getByText("Premiered Oct 3, 2026")).toBeTruthy();
  });
});
