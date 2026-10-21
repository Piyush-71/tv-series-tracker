import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ErrorPage from "@/app/error";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("re-fetches the failed route through the installed Next.js retry prop", () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  const retry = vi.fn();
  render(<ErrorPage error={new Error("Upstream temporarily unavailable")} retry={retry} />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
});
