import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SharedListPage from "./page";

vi.mock("@/components/media/shared-collection", () => ({ SharedCollection: ({ ids }: { ids: string[] }) => <div data-testid="shared-identities">{ids.join(",")}</div> }));
afterEach(cleanup);

it("passes all shared identities including Simkl IDs beyond the old fifty-title limit", async () => {
  const ids = [...Array.from({ length: 55 }, (_, index) => `tv-${index + 1}`), "simkl-77"];
  render(await SharedListPage({ searchParams: Promise.resolve({ ids: ids.join(",") }) }));
  expect(screen.getByTestId("shared-identities").textContent).toBe(ids.join(","));
  expect(screen.getByText("56 titles shared with you.")).toBeTruthy();
});
