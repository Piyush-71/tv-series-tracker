"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  LoaderCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { MediaEpisode, MediaTitle } from "@/types/media";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";
import { formatReleaseDate } from "@/lib/utils";

export function EpisodeTracker({ title }: { title: MediaTitle }) {
  const [season, setSeason] = useState(1);
  const tracker = useTracker();
  const watchedKeys = tracker.data.episodeProgress[title.id] ?? [];
  const seasonCount = Math.max(title.seasonCount ?? 1, 1);
  const total = title.episodeCount ?? 0;
  const percent = total ? Math.round((watchedKeys.length / total) * 100) : 0;

  return (
    <section className="mt-10" aria-labelledby="episodes-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="episodes-heading"
            className="text-2xl font-semibold text-foreground"
          >
            Episode tracker
          </h2>
          <p className="mt-1 text-sm text-muted">
            {watchedKeys.length} of {total || "?"} watched · {percent}% complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="secondary"
            disabled={season <= 1}
            onClick={() => setSeason((value) => value - 1)}
            aria-label="Previous season"
          >
            <ChevronLeft size={17} />
          </Button>
          <span className="min-w-24 text-center text-sm font-bold text-foreground">
            Season {season}
          </span>
          <Button
            size="icon"
            variant="secondary"
            disabled={season >= seasonCount}
            onClick={() => setSeason((value) => value + 1)}
            aria-label="Next season"
          >
            <ChevronRight size={17} />
          </Button>
        </div>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface"
        aria-label={`${percent}% watched`}
      >
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${percent}%` }}
        />
      </div>

      <SeasonEpisodes
        key={season}
        title={title}
        season={season}
        watchedKeys={watchedKeys}
        onToggle={(episodeKey) => tracker.toggleEpisode(title.id, episodeKey)}
      />
    </section>
  );
}

function SeasonEpisodes({
  title,
  season,
  watchedKeys,
  onToggle,
}: {
  title: MediaTitle;
  season: number;
  watchedKeys: string[];
  onToggle: (episodeKey: string) => void;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    episodes: MediaEpisode[];
    error: string;
  }>({ loading: true, episodes: [], error: "" });
  const watchedSet = new Set(watchedKeys);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/titles/${title.slug}/seasons/${season}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          results?: MediaEpisode[];
          error?: { message: string };
        };
        if (!response.ok)
          throw new Error(
            body.error?.message || "Episode data is unavailable.",
          );
        setState({ loading: false, episodes: body.results ?? [], error: "" });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setState({
          loading: false,
          episodes: [],
          error:
            reason instanceof Error
              ? reason.message
              : "Episode data is unavailable.",
        });
      });
    return () => controller.abort();
  }, [season, title.slug]);

  if (state.loading)
    return (
      <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-surface p-5 text-sm text-muted">
        <LoaderCircle className="animate-spin" size={17} />
        Loading season {season}…
      </div>
    );
  if (state.error)
    return (
      <div
        className="mt-5 rounded-lg border border-danger/40 bg-danger/10 p-5 text-sm text-danger"
        role="alert"
      >
        {state.error}
      </div>
    );
  if (!state.episodes.length)
    return (
      <div className="mt-5 rounded-lg border border-border bg-surface p-5 text-sm text-muted">
        Episode information has not been published for this season yet.
      </div>
    );

  return (
    <div className="mt-5 grid gap-3">
      {state.episodes.map((episode) => {
        const watched = watchedSet.has(episode.id);
        return (
          <article
            key={episode.id}
            className="grid gap-4 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[180px_1fr_auto] sm:items-center"
          >
            {episode.still ? (
              <Image
                src={episode.still}
                alt=""
                width={180}
                height={101}
                className="aspect-video w-full rounded-md object-cover"
              />
            ) : (
              <div className="aspect-video rounded-md bg-surface" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                S{episode.seasonNumber} E{episode.episodeNumber}
              </p>
              <h3 className="mt-1 font-bold text-foreground">{episode.name}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted">
                {episode.overview}
              </p>
              <p className="mt-2 text-xs text-muted">
                {episode.airDate
                  ? formatReleaseDate(episode.airDate)
                  : "Airdate TBA"}
                {episode.runtime ? ` · ${episode.runtime} min` : ""}
              </p>
            </div>
            <Button
              variant={watched ? "primary" : "secondary"}
              onClick={() => onToggle(episode.id)}
              aria-pressed={watched}
            >
              {watched ? <Check size={17} /> : <Circle size={17} />}
              {watched ? "Watched" : "Mark watched"}
            </Button>
          </article>
        );
      })}
    </div>
  );
}
