"use client";

import { useEffect, useState } from "react";

const key = "cinecount-watchlist";

export function useWatchlist() {
  const [ids, setIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as string[]) : [];
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(ids));
  }, [ids]);

  function persist(next: string[]) {
    setIds(next);
  }

  return {
    ids,
    has: (id: string) => ids.includes(id),
    toggle: (id: string) => {
      persist(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
    },
  };
}
