import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrackerProvider } from "@/components/tracker/tracker-provider";
import { useTracker } from "@/hooks/use-tracker";
import { useEffect, useRef } from "react";
import { NotifyButton } from "@/components/tracker/notify-button";
import { PersonalTitleControls } from "@/components/tracker/personal-title-controls";
import type { MediaTitle } from "@/types/media";
import {
  createTrackerData,
  legacyWatchlistKey,
  getTrackerStorageKey,
  trackerStorageKey,
} from "@/lib/tracker";

const auth = vi.hoisted(() => ({
  isLoaded: true,
  userId: "alice" as string | null,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => auth }));

beforeEach(() => {
  localStorage.clear();
  auth.isLoaded = true;
  auth.userId = "alice";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("uses the current override when notification permission resolves later", async () => {
  let grant!: (permission: NotificationPermission) => void;
  vi.stubGlobal("Notification", {
    permission: "default",
    requestPermission: () => new Promise<NotificationPermission>((resolve) => { grant = resolve; }),
  });
  const title = { id: "tv-42", title: "Example", type: "tv", releaseDate: "2010-01-01", nextEpisode: { airDate: "2099-03-04" } } as MediaTitle;
  const { result } = renderHook(() => useTracker(), {
    wrapper: ({ children }) => <TrackerProvider><NotifyButton title={title} />{children}</TrackerProvider>,
  });
  fireEvent.click(screen.getByRole("button"));
  act(() => result.current.setReleaseOverride("tv-42", "2099-04-05"));
  await act(async () => grant("granted"));
  expect(result.current.data.reminders["tv-42"].releaseDate).toBe("2099-04-05");
});

describe("account-isolated tracker hook", () => {
  it("keeps account, guest and returning-account state separate", () => {
    const { result, rerender } = renderHook(() => useTracker(), {
      wrapper: TrackerProvider,
    });
    act(() => result.current.setNote("tv-42", "Alice private note"));
    const aliceActions = result.current;
    auth.userId = "bob";
    rerender();
    expect(result.current.data.notes).toEqual({});
    act(() => aliceActions.setNote("tv-42", "stale async write"));
    act(() => result.current.setNote("tv-42", "Bob private note"));
    auth.userId = null;
    rerender();
    expect(result.current.data.notes).toEqual({});
    act(() => result.current.setNote("tv-42", "Guest note"));
    auth.userId = "alice";
    rerender();
    expect(result.current.data.notes).toEqual({
      "tv-42": "Alice private note",
    });
  });

  it("never reads or writes personal snapshots while Clerk is loading", () => {
    const saved = createTrackerData();
    saved.notes = { "tv-42": "Legacy private note" };
    localStorage.setItem(trackerStorageKey, JSON.stringify(saved));
    auth.isLoaded = false;
    const before = { ...localStorage };
    const { result, rerender } = renderHook(() => useTracker(), {
      wrapper: TrackerProvider,
    });
    expect(result.current.data.notes).toEqual({});
    act(() => result.current.setNote("tv-42", "Loading write"));
    expect({ ...localStorage }).toEqual(before);
    auth.isLoaded = true;
    rerender();
    expect(result.current.data.notes).toEqual({});
    auth.userId = null;
    rerender();
    expect(result.current.data.notes).toEqual(saved.notes);
  });

  it("reschedules an existing reminder when an override changes and restores its official target", () => {
    const { result } = renderHook(() => useTracker(), {
      wrapper: TrackerProvider,
    });
    act(() =>
      result.current.setReminder(
        {
          id: "tv-42",
          title: "Example",
          releaseDate: "2099-03-04",
          leadMinutes: 1440,
          createdAt: "2026-10-20T10:00:00Z",
          status: "delivered",
        },
        "tv-42",
      ),
    );
    act(() => result.current.setReleaseOverride("tv-42", "2099-04-05"));
    expect(result.current.data.reminders["tv-42"]).toMatchObject({
      releaseDate: "2099-04-05",
      status: "scheduled",
    });
    act(() => result.current.setReleaseOverride("tv-42", null));
    expect(result.current.data.reminders["tv-42"]).toMatchObject({
      releaseDate: "2099-03-04",
      status: "scheduled",
    });
  });
});

describe("tracker browser lifecycle", () => {
  it("hydrates the account storage and ignores foreign-account storage events", () => {
    const saved = createTrackerData();
    saved.watchlistIds = ["tv-alice"];
    localStorage.setItem(getTrackerStorageKey("alice"), JSON.stringify(saved));
    const { result } = renderHook(() => useTracker(), {
      wrapper: TrackerProvider,
    });
    expect(result.current.data.watchlistIds).toEqual(["tv-alice"]);
    saved.watchlistIds = ["tv-bob"];
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: getTrackerStorageKey("bob"),
          newValue: JSON.stringify(saved),
        }),
      ),
    );
    expect(result.current.data.watchlistIds).toEqual(["tv-alice"]);
    saved.watchlistIds = ["tv-alice-updated"];
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: getTrackerStorageKey("alice"),
          newValue: JSON.stringify(saved),
        }),
      ),
    );
    expect(result.current.data.watchlistIds).toEqual(["tv-alice-updated"]);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: getTrackerStorageKey("alice"),
          newValue: "bad json",
        }),
      ),
    );
    expect(result.current.data.watchlistIds).toEqual(["tv-alice-updated"]);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: getTrackerStorageKey("alice"),
          newValue: null,
        }),
      ),
    );
    expect(result.current.data.watchlistIds).toEqual([]);
  });

  it("clears account data throughout sign-out loading, blocks stale callbacks and restores guest data", () => {
    auth.userId = null;
    const { result, rerender } = renderHook(() => useTracker(), {
      wrapper: TrackerProvider,
    });
    act(() => result.current.toggleWatchlist("guest-title"));
    auth.userId = "alice";
    rerender();
    act(() => result.current.toggleWatchlist("alice-title"));
    const stale = result.current;
    auth.isLoaded = false;
    rerender();
    expect(result.current.isReady).toBe(false);
    expect(result.current.data.watchlistIds).toEqual([]);
    const before = { ...localStorage };
    act(() => stale.toggleWatchlist("late-alice-title"));
    act(() => result.current.toggleWatchlist("loading-title"));
    expect({ ...localStorage }).toEqual(before);
    auth.isLoaded = true;
    auth.userId = null;
    rerender();
    expect(result.current.data.watchlistIds).toEqual(["guest-title"]);
    expect(
      JSON.parse(localStorage.getItem(getTrackerStorageKey("alice"))!)
        .watchlistIds,
    ).toEqual(["alice-title"]);
  });

  it("remounts effect consumers after auth resolves so recently-viewed tracking uses the correct store", () => {
    function Viewer() {
      const tracker = useTracker();
      const viewed = useRef(tracker.markViewed);
      useEffect(() => viewed.current("tv-42"), []);
      return (
        <span>
          {tracker.data.recentlyViewed.map((item) => item.id).join(",")}
        </span>
      );
    }
    auth.isLoaded = false;
    const { rerender } = render(
      <TrackerProvider>
        <Viewer />
      </TrackerProvider>,
    );
    expect(localStorage.length).toBe(0);
    auth.isLoaded = true;
    rerender(
      <TrackerProvider>
        <Viewer />
      </TrackerProvider>,
    );
    expect(screen.getByText("tv-42")).toBeDefined();
    expect(
      JSON.parse(localStorage.getItem(getTrackerStorageKey("alice"))!)
        .recentlyViewed[0].id,
    ).toBe("tv-42");
  });

  it("does not leave the previous account's uncontrolled note in the visible form", () => {
    const saved = createTrackerData();
    saved.notes["tv-42"] = "Alice private note";
    localStorage.setItem(getTrackerStorageKey("alice"), JSON.stringify(saved));
    const title = {
      id: "tv-42",
      type: "tv",
      releaseDate: "2010-01-01",
    } as MediaTitle;
    const { rerender } = render(
      <TrackerProvider>
        <PersonalTitleControls title={title} />
      </TrackerProvider>,
    );
    expect(
      (screen.getByLabelText("Private note") as HTMLTextAreaElement).value,
    ).toBe("Alice private note");
    auth.userId = "bob";
    rerender(
      <TrackerProvider>
        <PersonalTitleControls title={title} />
      </TrackerProvider>,
    );
    expect(
      (screen.getByLabelText("Private note") as HTMLTextAreaElement).value,
    ).toBe("");
  });

  it("keeps valid state untouched when a malformed import is attempted", () => {
    const { result } = renderHook(() => useTracker(), {
      wrapper: TrackerProvider,
    });
    act(() => result.current.toggleWatchlist("tv-42"));
    const invalid = createTrackerData();
    invalid.releaseOverrides["tv-42"] = "bad date";
    expect(() => result.current.replaceData(invalid)).toThrow(
      "Invalid Cinecount tracker file",
    );
    expect(result.current.data.watchlistIds).toEqual(["tv-42"]);
    expect(
      JSON.parse(localStorage.getItem(getTrackerStorageKey("alice"))!)
        .watchlistIds,
    ).toEqual(["tv-42"]);
  });
});

it("keeps the legacy watchlist guest-only and writes only scoped storage", () => {
  localStorage.setItem(legacyWatchlistKey, JSON.stringify(["legacy-title"]));
  const { result, rerender } = renderHook(() => useTracker(), {
    wrapper: TrackerProvider,
  });
  expect(result.current.data.watchlistIds).toEqual([]);
  auth.userId = null;
  rerender();
  expect(result.current.data.watchlistIds).toEqual(["legacy-title"]);
  act(() => result.current.toggleWatchlist("guest-title"));
  expect(
    JSON.parse(localStorage.getItem(getTrackerStorageKey(null))!).watchlistIds,
  ).toEqual(["legacy-title", "guest-title"]);
  expect(localStorage.getItem(legacyWatchlistKey)).toBe(
    JSON.stringify(["legacy-title"]),
  );
  expect(localStorage.getItem(trackerStorageKey)).toBeNull();
});

it("uses the current next episode when the official-date control removes a legacy override", () => {
  const saved = createTrackerData();
  saved.releaseOverrides["tv-42"] = "2099-11-01";
  saved.reminders["tv-42"] = {
    id: "tv-42",
    title: "Example",
    releaseDate: "2099-11-01",
    leadMinutes: 1440,
    createdAt: "2026-10-20T10:00:00Z",
    status: "delivered",
  };
  localStorage.setItem(getTrackerStorageKey("alice"), JSON.stringify(saved));
  const title = {
    id: "tv-42",
    type: "tv",
    releaseDate: "2010-01-01",
    nextEpisode: { airDate: "2099-12-01" },
  } as MediaTitle;
  const { result } = renderHook(() => useTracker(), {
    wrapper: ({ children }) => (
      <TrackerProvider>
        <PersonalTitleControls title={title} />
        {children}
      </TrackerProvider>
    ),
  });
  fireEvent.click(screen.getByRole("button", { name: "Use official date" }));
  expect(result.current.data.reminders["tv-42"]).toMatchObject({
    releaseDate: "2099-12-01",
    status: "scheduled",
  });
  expect(result.current.data.releaseOverrides).toEqual({});
});

it("does not save a reminder into either account when permission resolves after switching", async () => {
  let grant!: (permission: NotificationPermission) => void;
  const permission = new Promise<NotificationPermission>((resolve) => {
    grant = resolve;
  });
  vi.stubGlobal("Notification", {
    permission: "default",
    requestPermission: () => permission,
  });
  const title = {
    id: "tv-42",
    title: "Example",
    type: "tv",
    releaseDate: "2010-01-01",
    nextEpisode: { airDate: "2099-12-01" },
  } as MediaTitle;
  const { rerender } = render(
    <TrackerProvider>
      <NotifyButton title={title} />
    </TrackerProvider>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Remind me about Example" }),
  );
  auth.userId = "bob";
  rerender(
    <TrackerProvider>
      <NotifyButton title={title} />
    </TrackerProvider>,
  );
  await act(async () => {
    grant("granted");
    await permission;
  });
  expect(localStorage.getItem(getTrackerStorageKey("alice"))).toBeNull();
  expect(localStorage.getItem(getTrackerStorageKey("bob"))).toBeNull();
});
