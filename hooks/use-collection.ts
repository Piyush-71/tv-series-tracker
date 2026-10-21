"use client";

import { useEffect, useState } from "react";
import type { CollectionEntry } from "@/types/collection";

const batchSize = 25;

export function useCollection(ids: string[]) {
  const key = JSON.stringify([...new Set(ids)]);
  const [state, setState] = useState<{ key: string; entries: CollectionEntry[] } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const requested: string[] = JSON.parse(key);
    if (!requested.length) return;
    const controller = new AbortController();
    async function load() {
      const batches = Array.from({ length: Math.ceil(requested.length / batchSize) }, (_, index) => requested.slice(index * batchSize, (index + 1) * batchSize));
      const entries: CollectionEntry[][] = new Array(batches.length);
      let cursor = 0;
      await Promise.all(Array.from({ length: Math.min(2, batches.length) }, async () => {
        while (cursor < batches.length && !controller.signal.aborted) {
          const index = cursor++;
          const batch = batches[index];
          try {
            const response = await fetch("/api/collection", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: batch }), signal: controller.signal });
            if (!response.ok) throw new Error("Collection unavailable");
            const body: { results: CollectionEntry[] } = await response.json();
            const byId = new Map(body.results.map((entry) => [entry.id, entry]));
            entries[index] = batch.map((id) => byId.get(id) ?? { id, status: "unavailable" });
          } catch {
            entries[index] = batch.map((id) => ({ id, status: "unavailable" }));
          }
        }
      }));
      if (!controller.signal.aborted) setState({ key, entries: entries.flat() });
    }
    void load();
    return () => controller.abort();
  }, [key, retry]);
  const requested: string[] = JSON.parse(key);
  const current = state?.key === key ? state.entries : null;
  return {
    entries: current ?? requested.map((id): CollectionEntry => ({ id, status: "unavailable" })),
    loading: requested.length > 0 && !current,
    refresh: () => setRetry((value) => value + 1),
  };
}
