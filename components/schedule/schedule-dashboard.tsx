import { ArrowRight, ArrowUpRight, Bookmark, Radio } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ScheduleColumn } from "@/components/schedule/schedule-column";
import { ScheduleCountdown } from "@/components/schedule/schedule-countdown";
import { FollowShowButton } from "@/components/schedule/follow-show-button";
import { TimezoneStatus } from "@/components/schedule/timezone-status";
import { getScheduleTitleHref, getScheduleTrackerId } from "@/lib/schedule/format";
import type { ScheduleDashboard as Dashboard } from "@/types/schedule";
export function ScheduleDashboard({ dashboard }: { dashboard: Dashboard }) {
  if (dashboard.unavailable) {
    return (
      <section className="page-shell page-section">
        <div className="empty-state" role="alert">
          <h1 className="text-2xl font-semibold">
            The episode schedule is temporarily unavailable.
          </h1>
          <p className="mt-3 text-muted">
            Please try again to load the latest announced airtimes.
          </p>
          <form action="/" method="get" className="mt-5">
            <button type="submit" className="secondary-link">
              Try again
            </button>
          </form>
        </div>
      </section>
    );
  }
  const featured =
    dashboard.trending[0] ?? dashboard.airingSoon[0] ?? dashboard.upcoming[0];
  return (
    <div className="page-shell pb-16">
      <header className="home-intro">
        <div>
          <p className="eyebrow inline-flex items-center gap-2">
            <Radio size={14} aria-hidden="true" /> Your entertainment radar
          </p>
          <h1>
            Your next obsession.
            <br />
            <span>On the horizon.</span>
          </h1>
        </div>
        <div className="intro-copy">
          <p>
            Great TV. Perfect timing. Discover your next favorite, follow every
            premiere, and make the wait part of the fun.
          </p>
          <TimezoneStatus />
        </div>
      </header>
      <div className="feature-layout">
        {featured ? (
          <section
            className="spotlight hero-surface"
            aria-label="Featured episode"
          >
            <div className="feature-art">
              <Image
                src={featured.poster}
                alt=""
                fill
                preload
                sizes="(max-width: 767px) 100vw, 45vw"
              />
            </div>
            <div className="hero-shade absolute inset-0" />

            <div className="feature-copy">
              <p className="feature-kicker">Featured transmission</p>
              <h2>{featured.title}</h2>
              <p className="mt-3 text-sm text-hero-muted">
                Season {featured.seasonNumber} · Episode{" "}
                {featured.episodeNumber}
              </p>
              <div className="mt-6">
                <ScheduleCountdown airsAt={featured.airsAt} large />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={getScheduleTitleHref(featured)}
                  className="action-link"
                >
                  Explore the show <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
                <FollowShowButton
                  trackerId={getScheduleTrackerId(featured)}
                  title={featured.title}
                />
              </div>
            </div>
          </section>
        ) : null}

        <aside className="next-rail" aria-label="Next episodes">
          <p className="eyebrow">
            On the radar <Radio size={14} aria-hidden="true" />
          </p>
          <h2>Coming into view</h2>
          {dashboard.airingSoon.slice(0, 3).map((episode) => (
            <Link
              key={episode.id}
              href={getScheduleTitleHref(episode)}
              className="next-link"
            >
              <span className="next-poster">
                <Image
                  src={episode.poster}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </span>
              <span>
                <strong>{episode.title}</strong>
                <small>
                  Season {episode.seasonNumber} · Episode{" "}
                  {episode.episodeNumber}
                </small>
              </span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          ))}
          {dashboard.airingSoon.length === 0 ? (
            <p className="text-sm leading-6 text-muted">
              No episodes announced in the next 24 hours.
            </p>
          ) : null}
          <Link
            href="/soon"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-accent"
          >
            Full airing schedule <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </aside>
      </div>
      <nav aria-label="Schedule categories" className="category-nav">
        {[
          ["Airing soon", "/soon"],
          ["New series", "/upcoming"],
          ["Season premieres", "/season-premieres"],
          ["Recently aired", "/aired"],
          ["Explore all titles", "/explore"],
        ].map(([label, href], index) => (
          <Link key={href} href={href}>
            <span className="text-muted text-[10px]" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            {label}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <div className="grid gap-10 lg:grid-cols-3 lg:gap-6">
        <ScheduleColumn
          title="Trending TV Shows"
          eyebrow="Everyone’s talking about"
          href="/trending"
          items={dashboard.trending}
        />
        <ScheduleColumn
          title="Upcoming TV Shows"
          eyebrow="The next new obsession"
          href="/upcoming"
          items={dashboard.upcoming}
        />
        <ScheduleColumn
          title="Airing Soon"
          eyebrow="Next on the clock"
          href="/soon"
          items={dashboard.airingSoon}
        />
      </div>
      <section className="collection-callout">
        <div>
          <p className="eyebrow mb-4 inline-flex items-center gap-2">
            <Bookmark size={14} aria-hidden="true" /> Your personal collection
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Every story. In your orbit.
          </h2>
          <p className="mt-3 text-sm text-muted">
            Keep the next episode of every favorite in one place.
          </p>
        </div>
        <Link
          href="/my-countdowns"
          prefetch={false}
          className="action-link self-start sm:self-auto"
        >
          Make it yours <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
      <p className="mt-8 text-center text-xs leading-6 text-muted">
        Schedules by{" "}
        <a
          href="https://simkl.com"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Simkl
        </a>
        . Airtimes are shown in your selected timezone.
      </p>
    </div>
  );
}
