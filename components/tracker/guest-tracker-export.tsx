"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";

/** Moving guest/legacy data into an account always requires an explicit import. */
export function GuestTrackerExport() {
  const { data } = useTracker();
  const hasData = data.watchlistIds.length || data.watchedTitleIds.length ||
    data.recentlyViewed.length || Object.keys(data.episodeProgress).length ||
    Object.keys(data.ratings).length || Object.keys(data.notes).length ||
    Object.keys(data.reminders).length || Object.keys(data.releaseOverrides).length ||
    data.searchHistory.length || data.preferences.favoriteGenres.length || data.preferences.services.length;
  if (!hasData) return null;

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "cinecount-guest-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-7 rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold">Keep your existing browser data</p>
      <p className="mt-2 text-sm leading-6 text-muted">
        Guest data and backups from older versions stay separate from signed-in accounts.
        Export a backup now, then use Import JSON in your profile to move it into the account you choose.
      </p>
      <Button variant="secondary" className="mt-4" onClick={download}>
        <Download size={16} aria-hidden="true" /> Export guest data
      </Button>
    </div>
  );
}
