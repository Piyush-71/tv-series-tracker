"use client";

import { CheckCircle2, Circle, Star } from "lucide-react";
import type { MediaTitle } from "@/types/media";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";

export function PersonalTitleControls({ title }: { title: MediaTitle }) {
  const tracker = useTracker();
  const watched = tracker.data.watchedTitleIds.includes(title.id);
  const rating = tracker.data.ratings[title.id] ?? 0;
  const savedNote = tracker.data.notes[title.id] ?? "";

  return (
    <section className="mt-10 rounded-xl border border-white/10 bg-white/[0.055] p-5" aria-labelledby="personal-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="personal-heading" className="text-xl font-black text-white">Your tracking</h2>
          <p className="mt-1 text-sm text-zinc-400">Stored only in this browser for now.</p>
        </div>
        <Button variant={watched ? "primary" : "secondary"} onClick={() => tracker.toggleTitleWatched(title.id)} aria-pressed={watched}>
          {watched ? <CheckCircle2 size={18} /> : <Circle size={18} />}{watched ? "Watched" : "Mark watched"}
        </Button>
      </div>
      <div className="mt-5">
        <p className="text-sm font-semibold text-zinc-300">Your rating</p>
        <div className="mt-2 flex gap-1" role="group" aria-label="Your rating out of five">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} onClick={() => tracker.setRating(title.id, value === rating ? null : value)} className="rounded p-1 text-amber-300 hover:bg-white/10" aria-label={`${value} stars`} aria-pressed={value <= rating}>
              <Star size={24} fill={value <= rating ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </div>
      <label className="mt-5 block text-sm font-semibold text-zinc-300" htmlFor={`note-${title.id}`}>Private note</label>
      <textarea
        id={`note-${title.id}`}
        defaultValue={savedNote}
        onBlur={(event) => tracker.setNote(title.id, event.target.value)}
        rows={4}
        placeholder="What did you think? What should you remember before the next episode?"
        className="mt-2 w-full rounded-lg border border-white/12 bg-black/25 p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-300/70"
      />
      <div className="mt-5 border-t border-white/10 pt-5">
        <label className="block text-sm font-semibold text-zinc-300" htmlFor={`release-${title.id}`}>Regional or corrected release time</label>
        <p className="mt-1 text-xs text-zinc-500">Use an official regional date below, or enter a precise local time. This changes countdowns only in your browser.</p>
        {title.releaseDates?.length ? (
          <select
            className="mt-3 h-11 w-full rounded-lg border border-white/12 bg-black px-3 text-sm text-white"
            value={tracker.data.releaseOverrides[title.id] ?? ""}
            onChange={(event) => tracker.setReleaseOverride(title.id, event.target.value || null)}
            aria-label="Select an official release date"
          >
            <option value="">Primary release date</option>
            {title.releaseDates.slice(0, 12).map((release, index) => <option key={`${release.kind}-${release.date}-${index}`} value={release.date}>{release.region} · {release.kind} · {new Date(release.date).toLocaleString()}</option>)}
          </select>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            id={`release-${title.id}`}
            type="datetime-local"
            className="h-11 min-w-64 flex-1 rounded-lg border border-white/12 bg-black px-3 text-sm text-white"
            onChange={(event) => tracker.setReleaseOverride(title.id, event.target.value ? new Date(event.target.value).toISOString() : null)}
          />
          {tracker.data.releaseOverrides[title.id] ? <Button variant="ghost" onClick={() => tracker.setReleaseOverride(title.id, null)}>Use official date</Button> : null}
        </div>
      </div>
    </section>
  );
}
