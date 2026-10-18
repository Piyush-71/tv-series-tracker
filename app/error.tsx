"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "ui.error",
        message: error.message,
        digest: error.digest,
      }),
    });
  }, [error]);

  return (
    <section className="page-shell page-section grid min-h-[70svh] place-items-center text-center">
      <div className="max-w-lg rounded-xl border border-border bg-surface p-8">
        <AlertTriangle className="mx-auto text-foreground" size={36} />
        <h1 className="mt-4 text-3xl font-semibold text-foreground">
          The signal dropped.
        </h1>
        <p className="mt-3 text-muted">
          Cinecount could not load this view. Your locally saved tracking data
          is safe.
        </p>
        <Button className="mt-6" onClick={unstable_retry}>
          <RotateCcw size={17} />
          Try again
        </Button>
      </div>
    </section>
  );
}
