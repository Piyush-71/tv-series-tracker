import { ArrowRight, ArrowUpRight, Bookmark, Radio } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ScheduleColumn } from "@/components/schedule/schedule-column";
import { ScheduleCountdown } from "@/components/schedule/schedule-countdown";
import { FollowShowButton } from "@/components/schedule/follow-show-button";
import { TimezoneStatus } from "@/components/schedule/timezone-status";
import { getScheduleTrackerId } from "@/lib/schedule/format";
import type { ScheduleDashboard as Dashboard } from "@/types/schedule";
export function ScheduleDashboard({ dashboard }: { dashboard: Dashboard }) {
  const featured =
    dashboard.trending[0] ?? dashboard.airingSoon[0] ?? dashboard.upcoming[0];
  return (
    <div className="page-shell pb-16 pt-9 sm:pt-12">
      <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow inline-flex items-center gap-2">
            <Radio size={14} aria-hidden="true" />
            The episode edit
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl">
            Good stories.
            <br className="hidden sm:block" /> Worth the wait.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
            Stay ahead of the next episode. Discover premieres and follow the
            shows you love, on your time.
          </p>
        </div>
        <TimezoneStatus />
      </header>
      {featured ? (
        <section className="hero-surface relative isolate overflow-hidden rounded-3xl border border-border">
          <div className="absolute inset-y-0 right-0 w-full opacity-35 sm:w-[48%] sm:opacity-100">
            <Image
              src={featured.poster}
              alt=""
              fill
              preload
              sizes="(max-width: 639px) 100vw, 50vw"
              className="object-cover object-[center_25%]"
            />
          </div>
          <div className="hero-shade absolute inset-0" />
          <div className="relative max-w-2xl px-6 py-9 sm:px-10 sm:py-10">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              In the spotlight
            </p>
            <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-hero-text sm:text-5xl">
              {featured.title}
            </h2>
            <p className="mt-3 text-sm text-hero-muted">
              Season {featured.seasonNumber} · Episode {featured.episodeNumber}
            </p>
            <div className="mt-7 max-w-lg">
              <ScheduleCountdown airsAt={featured.airsAt} large />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/show/${featured.showId}/${featured.slug}`}
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
      <nav
        aria-label="Schedule categories"
        className="my-8 flex flex-wrap gap-2 border-b border-border pb-7"
      >
        {[
          ["Airing soon", "/soon"],
          ["New series", "/upcoming"],
          ["Season premieres", "/season-premieres"],
          ["Recently aired", "/aired"],
          ["Explore all titles", "/explore"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="secondary-link px-4 text-xs">
            {label}
            <ArrowUpRight size={13} aria-hidden="true" />
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
      <section className="mt-12 flex flex-col justify-between gap-6 rounded-3xl border border-border bg-surface px-6 py-8 sm:flex-row sm:items-center sm:px-9">
        <div>
          <Bookmark className="mb-3 text-muted" size={24} aria-hidden="true" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Your shows. Your countdowns.
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
