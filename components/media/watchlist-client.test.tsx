import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { mediaTitles } from "@/data/media";
import { WatchlistClient } from "./watchlist-client";

vi.mock("@/hooks/use-watchlist", () => ({ useWatchlist: () => ({ ids: ["tv-999"], has: () => true, toggle: vi.fn() }) }));
vi.mock("@/components/media/media-grid", () => ({ MediaGrid: ({ items }: { items: Array<{ title: string }> }) => <div>{items.map((item) => item.title).join(", ")}</div> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("resolves a saved title even when it is absent from discovery and the schedule", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ id: "tv-999", status: "ready", title: { ...mediaTitles[0], id: "tv-999", title: "Saved outside discovery" } }] }) }));
  render(<WatchlistClient />);
  expect(await screen.findByText("Saved outside discovery")).toBeTruthy();
  expect(screen.queryByText("My Countdowns is waiting.")).toBeNull();
});
