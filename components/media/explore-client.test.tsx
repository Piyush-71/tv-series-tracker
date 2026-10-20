import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  cleanup,
  act,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExploreClient } from "@/components/media/explore-client";
import type { BrowsePage, BrowseResult } from "@/lib/browse/types";
import { mediaTitles } from "@/data/media";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@/hooks/use-tracker", () => ({
  useTracker: () => ({ data: { preferences: { timeZone: "UTC" } } }),
}));
vi.mock("@/components/media/browse-card", () => ({
  BrowseCard: ({ result }: { result: BrowseResult }) => (
    <article>{result.title.title}</article>
  ),
}));
const options = {
  countries: [{ code: "KR", label: "South Korea" }],
  languages: [{ code: "ko", label: "Korean" }, { code: "en", label: "English" }],
  genres: ["Drama"],
};
const page: BrowsePage = {
  results: [],
  totalResults: 0,
  totalPages: 0,
  page: 1,
  hasMore: false,
  snapshot: "0123456789abcdef",
  coverage: {
    configured: true,
    verifiedTitles: 10,
    candidateTitles: 10,
    unavailableTitles: 0,
    updatedAt: "2026-10-03",
  },
};
let fetchMock: ReturnType<typeof vi.fn>;
const showModal = HTMLDialogElement.prototype.showModal;
const closeDialog = HTMLDialogElement.prototype.close;

// jsdom does not implement the browser's native dialog methods.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterAll(() => {
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = closeDialog;
});

beforeEach(() => {
  window.history.replaceState(null, "", "/explore");
  fetchMock = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify(page)));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function ready() {
  await screen.findByText("No matches");
}

describe("Explore filter application", () => {
  it("renders matches and enables filters while card details are still loading", async () => {
    const summary = { ...page, detailsPending: true, totalResults: 1, results: [{ title: mediaTitles[0], date: "2026-10-01", season: 1, rating: null, popularity: null, nextEpisodeDate: null, detailsPending: true }] };
    let finishDetails!: (response: Response) => void;
    const details = new Promise<Response>((resolve) => { finishDetails = resolve; });
    fetchMock.mockReset().mockResolvedValueOnce(new Response(JSON.stringify(summary))).mockReturnValueOnce(details);
    render(<ExploreClient options={options} />);
    await screen.findByText(mediaTitles[0].title);
    expect((screen.getByRole("button", { name: "Apply filters" }) as HTMLButtonElement).disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1][0]), "http://localhost").searchParams.get("details")).toBe("1");
    expect(new URL(String(fetchMock.mock.calls[1][0]), "http://localhost").searchParams.get("snapshot")).toBe(page.snapshot);
    finishDetails(new Response(JSON.stringify({ ...summary, detailsPending: false, results: [{ ...summary.results[0], title: { ...mediaTitles[0], title: "Enriched title" } }] })));
    await screen.findByText("Enriched title");
  });
  it("retains matches if optional background card details fail", async () => {
    const summary = { ...page, detailsPending: true, totalResults: 1, results: [{ title: mediaTitles[0], date: "2026-10-01", season: 1, rating: null, popularity: null, nextEpisodeDate: null, detailsPending: true }] };
    fetchMock.mockReset().mockResolvedValueOnce(new Response(JSON.stringify(summary))).mockRejectedValueOnce(new Error("Unavailable details"));
    render(<ExploreClient options={options} />);
    await screen.findByText(mediaTitles[0].title);
    await screen.findByText(/1 title has unavailable details/);
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("cancels stale card details when the applied filters change", async () => {
    const summary = { ...page, detailsPending: true, totalResults: 1, results: [{ title: mediaTitles[0], date: "2026-10-01", season: 1, rating: null, popularity: null, nextEpisodeDate: null, detailsPending: true }] };
    let finishDetails!: (response: Response) => void;
    const details = new Promise<Response>((resolve) => { finishDetails = resolve; });
    fetchMock.mockReset()
      .mockResolvedValueOnce(new Response(JSON.stringify(summary)))
      .mockReturnValueOnce(details)
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...summary, detailsPending: false, results: [{ ...summary.results[0], title: { ...mediaTitles[0], title: "New filter result" } }] })));
    const view = render(<ExploreClient options={options} />);
    await screen.findByText(mediaTitles[0].title);
    window.history.replaceState(null, "", "/explore?q=changed");
    view.rerender(<ExploreClient options={options} />);
    await screen.findByText("New filter result");
    expect(fetchMock.mock.calls[1][1].signal.aborted).toBe(true);
    await act(async () => finishDetails(new Response(JSON.stringify({ ...summary, results: [{ ...summary.results[0], title: { ...mediaTitles[0], title: "Stale details" } }] }))));
    expect(screen.queryByText("Stale details")).toBeNull();
    expect(screen.getByText("New filter result")).toBeDefined();
  });
  it("selects soonest first for Upcoming and preserves All dates when changing season status", async () => {
    const user = userEvent.setup();
    render(<ExploreClient options={options} />);
    await ready();
    await user.selectOptions(screen.getByRole("combobox", { name: "Premiere-date range" }), "upcoming");
    expect((screen.getByRole("combobox", { name: "Sort results" }) as HTMLSelectElement).value).toBe("oldest");
    expect(screen.getByRole("option", { name: "Soonest premiere" })).toBeDefined();
    await user.selectOptions(screen.getByRole("combobox", { name: "Premiere-date range" }), "all");
    await user.selectOptions(screen.getByRole("combobox", { name: "Season status" }), "returning");
    expect((screen.getByRole("combobox", { name: "Premiere-date range" }) as HTMLSelectElement).value).toBe("all");
  });
  it("preserves upcoming dates when switching from Series to Movies", async () => {
    window.history.replaceState(null, "", "/explore?range=upcoming&sort=oldest");
    const user = userEvent.setup();
    render(<ExploreClient options={options} />);
    await ready();
    await user.click(screen.getByRole("button", { name: "Movies" }));
    expect((screen.getByRole("combobox", { name: "Release-date range" }) as HTMLSelectElement).value).toBe("upcoming");
  });
  it("restores languages from the URL, preserves them when switching modes, and removes a language chip", async () => {
    window.history.replaceState(null, "", "/explore?language=ko&language=en");
    const user = userEvent.setup();
    const view = render(<ExploreClient options={options} />);
    await ready();
    expect(screen.getByRole("button", { name: "Language (2)" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Remove filter Language: Korean" })).toBeDefined();
    expect(fetchMock.mock.calls[0][0]).toContain("language=ko&language=en");
    await user.click(screen.getByRole("button", { name: "Movies" }));
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(new URLSearchParams(window.location.search).getAll("language")).toEqual(["ko", "en"]);
    view.rerender(<ExploreClient options={options} />);
    await ready();
    await user.click(screen.getByRole("button", { name: "Remove filter Language: Korean" }));
    expect(new URLSearchParams(window.location.search).getAll("language")).toEqual(["en"]);
    view.rerender(<ExploreClient options={options} />);
    await ready();
    await user.click(within(screen.getByRole("form", { name: "Explore filters" })).getByRole("button", { name: "Clear filters" }));
    expect(new URLSearchParams(window.location.search).has("language")).toBe(false);
  });
  it("keeps mobile edits when the modal closes and applies them from the search row", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    render(<ExploreClient options={options} />);
    await ready();
    expect(
      screen.queryByRole("combobox", { name: "Season status" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Filters" }));
    const modal = within(
      screen.getByRole("dialog", { name: "Explore filters" }),
    );
    await user.selectOptions(
      modal.getByRole("combobox", { name: "Season status" }),
      "airing",
    );
    expect(
      modal.queryByRole("combobox", { name: "Premiere-date range" }),
    ).toBeNull();
    await user.type(
      modal.getByRole("spinbutton", { name: "Minimum TMDB title rating / 10" }),
      "7.5",
    );
    await user.selectOptions(
      modal.getByRole("combobox", { name: "Sort results" }),
      "rating",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(modal.getByRole("button", { name: "Close filters" }));
    expect(
      screen.queryByRole("dialog", { name: "Explore filters" }),
    ).toBeNull();
    expect(
      screen.queryByRole("combobox", { name: "Season status" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("premiere")).toBe("airing");
    expect(params.get("minRating")).toBe("7.5");
    expect(params.get("sort")).toBe("rating");
    expect(params.has("range")).toBe(false);
  });
  it("keeps edits pending, hides series-only movie controls, and writes applied filters to the URL", async () => {
    const user = userEvent.setup();
    const view = render(<ExploreClient options={options} />);
    await ready();
    await user.click(screen.getByRole("button", { name: "Movies" }));
    expect(
      screen.queryByRole("combobox", { name: "Season status" }),
    ).toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Release-date range" }),
    ).toBeDefined();
    expect(
      screen.queryByRole("option", { name: "Next episode soonest" }),
    ).toBeNull();
    await user.type(
      screen.getByRole("textbox", { name: "Search by title" }),
      "Signal",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("type")).toBe("movie");
    expect(params.get("q")).toBe("Signal");
    expect(params.has("premiere")).toBe(false);
    expect(params.get("tz")).toBe("UTC");
    view.rerender(<ExploreClient options={options} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      screen
        .getByRole("textbox", { name: "Search by title" })
        .getAttribute("value"),
    ).toBe("Signal");
  });
  it("hides dates for Currently Airing and resets the selected mode to its defaults", async () => {
    const user = userEvent.setup();
    const view = render(<ExploreClient options={options} />);
    await ready();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Season status" }),
      "airing",
    );
    expect(
      screen.queryByRole("combobox", { name: "Premiere-date range" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(new URLSearchParams(window.location.search).has("range")).toBe(
      false,
    );
    view.rerender(<ExploreClient options={options} />);
    await ready();
    await user.click(
      within(screen.getByRole("form", { name: "Explore filters" })).getByRole(
        "button",
        { name: "Clear filters" },
      ),
    );
    expect(new URLSearchParams(window.location.search).get("premiere")).toBe(
      "new",
    );
    expect(new URLSearchParams(window.location.search).get("range")).toBe("30");
  });
  it("loads more using applied filters even when the search draft has changed", async () => {
    window.history.replaceState(null, "", "/explore?q=original");
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            ...page,
            hasMore: true,
            totalResults: 30,
            totalPages: 2,
          }),
        ),
    );
    const user = userEvent.setup();
    render(<ExploreClient options={options} />);
    await ready();
    await user.clear(screen.getByRole("textbox", { name: "Search by title" }));
    await user.type(
      screen.getByRole("textbox", { name: "Search by title" }),
      "unapplied",
    );
    await user.click(screen.getByRole("button", { name: "Load more results" }));
    const params = new URLSearchParams(window.location.search);
    expect(params.get("q")).toBe("original");
    expect(params.get("page")).toBe("2");
    expect(params.get("snapshot")).toBe(page.snapshot);
  });
  it("shows Clear filters only for edits beyond the defaults and preserves the selected mode when clearing", async () => {
    const user = userEvent.setup();
    const view = render(<ExploreClient options={options} />);
    await ready();
    const filters = within(
      screen.getByRole("form", { name: "Explore filters" }),
    );
    expect(filters.queryByRole("button", { name: "Clear filters" })).toBeNull();
    await user.click(filters.getByRole("button", { name: "Anime" }));
    expect(filters.queryByRole("button", { name: "Clear filters" })).toBeNull();
    await user.type(
      filters.getByRole("textbox", { name: "Search by title" }),
      "Signal",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(filters.getByRole("button", { name: "Clear filters" }));
    expect(new URLSearchParams(window.location.search).get("type")).toBe(
      "anime",
    );
    expect(new URLSearchParams(window.location.search).has("q")).toBe(false);
    view.rerender(<ExploreClient options={options} />);
    await ready();
    expect(
      within(screen.getByRole("form", { name: "Explore filters" })).queryByRole(
        "button",
        { name: "Clear filters" },
      ),
    ).toBeNull();
  });
  it("summarizes selected genres and preserves country, genre, custom date, rating, and sort query behavior", async () => {
    window.history.replaceState(
      null,
      "",
      "/explore?country=KR&genre=Drama&genre=Comedy&range=custom&from=2026-01-01&to=2026-10-07&minRating=7.5&sort=rating",
    );
    const user = userEvent.setup();
    render(<ExploreClient options={options} />);
    await ready();
    expect(screen.getByRole("button", { name: "Genre (2)" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Country (1)" })).toBeDefined();
    expect(screen.queryByRole("textbox", { name: "Find genre" })).toBeNull();
    await user.type(
      screen.getByRole("textbox", { name: "Search by title" }),
      "Signal",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    const params = new URLSearchParams(window.location.search);
    expect(params.getAll("country")).toEqual(["KR"]);
    expect(params.getAll("genre")).toEqual(["Drama", "Comedy"]);
    expect(params.get("range")).toBe("custom");
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-10-07");
    expect(params.get("minRating")).toBe("7.5");
    expect(params.get("sort")).toBe("rating");
    expect(params.get("q")).toBe("Signal");
  });
});
