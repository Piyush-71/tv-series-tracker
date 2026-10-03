import { CalendarDays, Compass, ListVideo, UserRound } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-10 sm:px-6 lg:px-10">
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <h2 className="text-xl font-black text-white">Cinecount</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
            Track exact TV episode airtimes, new series premieres, and personal countdowns in your local timezone.
          </p>
        </div>
        <div className="grid gap-2 text-sm">
          <Link href="/trending" className="text-zinc-400 hover:text-white">Trending</Link>
          <Link href="/upcoming" className="text-zinc-400 hover:text-white">Upcoming</Link>
          <Link href="/soon" className="text-zinc-400 hover:text-white">Airing Soon</Link>
          <Link href="/my-countdowns" prefetch={false} className="text-zinc-400 hover:text-white">My Countdowns</Link>
        </div>
        <div className="flex items-start gap-3">
          {[
            [Compass, "Explore", "/explore"],
            [CalendarDays, "Episode calendar", "/calendar"],
            [ListVideo, "My Countdowns", "/my-countdowns"],
            [UserRound, "Profile", "/profile"],
          ].map(([Icon, label, href]) => (
            <Link
              key={String(href)}
              href={String(href)}
              aria-label={String(label)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:border-violet-300/50 hover:text-white"
            >
              <Icon size={18} />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
