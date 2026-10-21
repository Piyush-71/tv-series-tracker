import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createTrackerData } from "@/lib/tracker";
import { GuestTrackerExport } from "./guest-tracker-export";

const fixture = vi.hoisted(() => ({ hasData: false }));
vi.mock("@/hooks/use-tracker", () => ({ useTracker: () => {
  const data = createTrackerData();
  if (fixture.hasData) data.notes = { "tv-1": "Older browser note" };
  return { data };
} }));
afterEach(() => { cleanup(); fixture.hasData = false; });

it("keeps the sign-in flow uncluttered when there is no guest data", () => {
  render(<GuestTrackerExport />);
  expect(screen.queryByRole("button", { name: "Export guest data" })).toBeNull();
});

it("offers an explicit backup instead of silently assigning legacy notes to an account", () => {
  fixture.hasData = true;
  render(<GuestTrackerExport />);
  expect(screen.getByRole("button", { name: "Export guest data" })).toBeTruthy();
  expect(screen.getByText(/account you choose/)).toBeTruthy();
});
