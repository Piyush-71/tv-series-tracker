import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { Airtime } from "@/components/schedule/airtime";
import { TimezoneSelect } from "@/components/tracker/timezone-select";
import { importTrackerData, trackerStorageKey } from "@/lib/tracker";

afterEach(cleanup);

it("updates all airtimes and selectors, saves the choice, and syncs other tabs", async () => {
  const user = userEvent.setup();
  render(<><TimezoneSelect /><TimezoneSelect /><Airtime airsAt="2026-01-02T01:00:00Z" /></>);
  await user.selectOptions(screen.getAllByRole("combobox")[0], "America/Los_Angeles");
  expect(screen.getByText("Thu, Jan 1, 5:00 PM PST")).toBeTruthy();
  expect(screen.getAllByRole<HTMLSelectElement>("combobox")[1].value).toBe("America/Los_Angeles");
  const saved = importTrackerData(localStorage.getItem(trackerStorageKey)!);
  expect(saved.preferences.timeZone).toBe("America/Los_Angeles");

  saved.preferences.timeZone = "Asia/Tokyo";
  act(() => window.dispatchEvent(new StorageEvent("storage", { key: trackerStorageKey, newValue: JSON.stringify(saved) })));
  expect(screen.getByText(/Fri, Jan 2, 10:00 AM/)).toBeTruthy();
  expect(screen.getAllByRole<HTMLSelectElement>("combobox")[0].value).toBe("Asia/Tokyo");
});
