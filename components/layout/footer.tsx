import { ArrowUpRight, Clapperboard } from "lucide-react";
import Link from "next/link";
export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="page-shell py-12">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2.5 text-xl font-semibold tracking-tight"
            >
              <Clapperboard size={22} aria-hidden="true" />
              cinecount.
            </Link>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
              Good stories are worth the wait.
              <br />
              Find your next one. Keep it close.
            </p>
          </div>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted"
          >
            <Link
              className="inline-flex min-h-11 items-center hover:text-foreground"
              href="/explore"
            >
              Explore
            </Link>
            <Link
              className="inline-flex min-h-11 items-center hover:text-foreground"
              href="/trending"
            >
              Trending
            </Link>
            <Link
              className="inline-flex min-h-11 items-center hover:text-foreground"
              href="/category/anime"
            >
              Anime
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-1 hover:text-foreground"
              href="/my-countdowns"
              prefetch={false}
            >
              My Countdowns <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <Link
              href="/calendar"
              className="inline-flex min-h-11 items-center hover:text-foreground"
            >
              Calendar
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center hover:text-foreground"
            >
              Profile
            </Link>
          </nav>
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-border pt-6 text-xs leading-5 text-muted">
          <p>
            © {new Date().getFullYear()} Cinecount. Made for the love of
            stories.
          </p>
          <p>Movie and TV data provided by TMDB.</p>
        </div>
      </div>
    </footer>
  );
}
