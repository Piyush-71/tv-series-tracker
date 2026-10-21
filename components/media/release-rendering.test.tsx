import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DetailView } from "@/components/media/detail-view";
import { CountdownTimer } from "@/components/media/countdown-timer";
import { mediaTitles } from "@/data/media";
const fixture = vi.hoisted(() => ({ overrides: {} as Record<string, string> }));

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/hooks/use-tracker", () => ({
  useTracker: () => ({ data: { releaseOverrides: fixture.overrides, preferences: { timeZone: "UTC" } }, markViewed: vi.fn() }),
}));
vi.mock("@/hooks/use-now", () => ({ useNow: () => Date.parse("2026-10-21T00:00:00Z") }));
vi.mock("@/hooks/use-watchlist", () => ({ useWatchlist: () => ({ has: () => false, toggle: vi.fn() }) }));
vi.mock("@/components/tracker/notify-button", () => ({ NotifyButton: () => null }));
vi.mock("@/components/tracker/personal-title-controls", () => ({ PersonalTitleControls: () => null }));
vi.mock("@/components/tracker/episode-tracker", () => ({ EpisodeTracker: () => null }));
vi.mock("@/components/media/carousel-section", () => ({ CarouselSection: () => null }));

afterEach(() => { cleanup(); fixture.overrides = {}; });

describe("unknown release rendering", () => {
  it("keeps a restored date-only reminder override free of invented airtimes", () => {
    fixture.overrides["tv-1"] = "2099-01-01";
    render(<CountdownTimer releaseDate="2008-01-20" titleId="tv-1" />);
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByText("Releases Jan 1, 2099")).toBeTruthy();
  });
  it.each([false, true])("renders TBA without a countdown (compact=%s)", (compact) => {
    render(<CountdownTimer releaseDate="" compact={compact} />);
    expect(screen.getByText("TBA")).toBeTruthy();
    expect(screen.queryByRole("timer")).toBeNull();
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("keeps an undated title detail usable with TBA year and release labels", () => {
    render(<DetailView title={{ ...mediaTitles[0], releaseDate: "" }} similar={[]} />);
    expect(screen.getByRole("heading", { level: 1, name: mediaTitles[0].title })).toBeTruthy();
    expect(screen.getAllByText("TBA").length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole("timer")).toBeNull();
    expect(document.body.textContent).not.toContain("NaN");
  });
});
