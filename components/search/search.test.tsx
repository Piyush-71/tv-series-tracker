import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SearchOverlay } from "@/components/search/search-overlay";
import SearchPage from "@/app/search/page";

vi.mock("@/hooks/use-tracker", () => ({ useTracker: () => ({ data: { searchHistory: [] }, addSearch: vi.fn() }) }));
vi.mock("@/lib/catalog", () => ({ searchCatalog: vi.fn().mockResolvedValue({ results: [], partial: false }) }));
vi.mock("@/components/media/media-grid", () => ({ MediaGrid: () => null }));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }));
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("search scope wording", () => {
  it("offers title search and suggests another title when no results match", async () => {
    render(<SearchOverlay open onOpenChange={vi.fn()} />);
    expect(screen.getByRole("searchbox", { name: "Search titles" })).toBeTruthy();
    expect(await screen.findByText("Try another title.")).toBeTruthy();
    expect(screen.queryByText(/titles, genres, or platforms/)).toBeNull();
  });

  it("describes the full search page as title search", async () => {
    render(await SearchPage({ searchParams: Promise.resolve({ q: "Signal" }) }));
    expect(screen.getByRole("searchbox", { name: "Search titles" })).toBeTruthy();
  });
});
