import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TrackerProvider } from "./tracker-provider";
import { AccountSync } from "./account-sync";
import { useTracker } from "@/hooks/use-tracker";
import { createTrackerData } from "@/lib/tracker";

const auth = vi.hoisted(() => ({
  isLoaded: true,
  userId: "alice" as string | null,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => auth }));
function Viewer() {
  const tracker = useTracker();
  return (
    <>
      <output>
        {tracker.data.watchlistIds.join(",") || "No saved titles"}
      </output>
      <p>{tracker.sync.message}</p>
    </>
  );
}
function App() {
  return (
    <TrackerProvider>
      <AccountSync />
      <Viewer />
    </TrackerProvider>
  );
}
beforeEach(() => {
  localStorage.clear();
  auth.userId = "alice";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("loads the current account and exposes a retry when the backend is offline", async () => {
  const data = createTrackerData();
  data.watchlistIds = ["tv-42"];
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(Response.json({ userId: "alice", data, revision: 1 }));
  vi.stubGlobal("fetch", fetcher);
  render(<App />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Retry account sync" }),
  );
  await screen.findByText("tv-42");
  await screen.findByText("Saved to your account");
  expect(
    screen.queryByRole("button", { name: "Retry account sync" }),
  ).toBeNull();
});
it("switches accounts without rendering or saving a late old-account response", async () => {
  let release!: (response: Response) => void;
  const bob = createTrackerData();
  bob.watchlistIds = ["bob-title"];
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      )
      .mockImplementation(async () =>
        Response.json({ userId: "bob", data: bob, revision: 1 }),
      ),
  );
  const { rerender } = render(<App />);
  auth.userId = "bob";
  rerender(<App />);
  await screen.findByText("bob-title");
  const alice = createTrackerData();
  alice.watchlistIds = ["alice-private"];
  await act(async () => {
    release(Response.json({ userId: "alice", data: alice, revision: 1 }));
    await Promise.resolve();
  });
  expect(screen.queryByText("alice-private")).toBeNull();
  expect(screen.getByText("bob-title")).toBeDefined();
});
it("does not contact the account backend for guests", async () => {
  auth.userId = null;
  vi.stubGlobal("fetch", vi.fn());
  render(<App />);
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeDefined(),
  );
  expect(fetch).not.toHaveBeenCalled();
});
