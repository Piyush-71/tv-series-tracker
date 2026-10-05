import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExploreClient } from "@/components/media/explore-client";
import type { BrowsePage, BrowseResult } from "@/lib/browse/types";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
vi.mock("@/hooks/use-tracker", () => ({ useTracker: () => ({ data: { preferences: { timeZone: "UTC" } } }) }));
vi.mock("@/components/media/browse-card", () => ({ BrowseCard: ({ result }: { result: BrowseResult }) => <article>{result.title.title}</article> }));
const options = { countries: [{ code: "KR", label: "South Korea" }], genres: ["Drama"] };
const page: BrowsePage = { results: [], totalResults: 0, totalPages: 0, page: 1, hasMore: false, snapshot: "0123456789abcdef", coverage: { configured: true, verifiedTitles: 10, candidateTitles: 10, unavailableTitles: 0, updatedAt: "2026-10-03" } };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.history.replaceState(null, "", "/explore");
  fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(page)));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function ready() { await screen.findByText("No matches"); }

describe("Explore filter application", () => {
  it("keeps edits pending, hides series-only movie controls, and writes applied filters to the URL", async () => {
    const user = userEvent.setup();
    const view = render(<ExploreClient options={options} />);
    await ready();
    await user.click(screen.getByRole("button", { name: "Movies" }));
    expect(screen.queryByRole("combobox", { name: "Season status" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Release-date range" })).toBeDefined();
    expect(screen.queryByRole("option", { name: "Next episode soonest" })).toBeNull();
    await user.type(screen.getByRole("textbox", { name: "Search by title" }), "Signal");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("type")).toBe("movie");
    expect(params.get("q")).toBe("Signal");
    expect(params.has("premiere")).toBe(false);
    expect(params.get("tz")).toBe("UTC");
    view.rerender(<ExploreClient options={options} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("textbox", { name: "Search by title" }).getAttribute("value")).toBe("Signal");
  });
  it("hides dates for Currently Airing and resets the selected mode to its defaults", async () => {
    const user = userEvent.setup();
    const view = render(<ExploreClient options={options} />);
    await ready();
    await user.selectOptions(screen.getByRole("combobox", { name: "Season status" }), "airing");
    expect(screen.queryByRole("combobox", { name: "Premiere-date range" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(new URLSearchParams(window.location.search).has("range")).toBe(false);
    view.rerender(<ExploreClient options={options} />);
    await ready();
    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(new URLSearchParams(window.location.search).get("premiere")).toBe("new");
    expect(new URLSearchParams(window.location.search).get("range")).toBe("30");
  });
  it("loads more using applied filters even when the search draft has changed", async () => {
    window.history.replaceState(null, "", "/explore?q=original");
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ...page, hasMore: true, totalResults: 30, totalPages: 2 })));
    const user = userEvent.setup();
    render(<ExploreClient options={options} />);
    await ready();
    await user.clear(screen.getByRole("textbox", { name: "Search by title" }));
    await user.type(screen.getByRole("textbox", { name: "Search by title" }), "unapplied");
    await user.click(screen.getByRole("button", { name: "Load more results" }));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBe("original");
    expect(params.get("page")).toBe("2");
    expect(params.get("snapshot")).toBe(page.snapshot);
  });
});
