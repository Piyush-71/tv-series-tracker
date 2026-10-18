"use client";
import { Show, UserButton } from "@clerk/nextjs";
import {
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Clock3,
  Monitor,
  UserRound,
  Clapperboard,
  Compass,
  Flame,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchOverlay } from "@/components/search/search-overlay";
import { useTracker } from "@/hooks/use-tracker";
import { useWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";

const links = [
  { label: "Discover", href: "/", icon: Compass },
  { label: "Explore", href: "/explore", icon: Clapperboard },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "My Countdowns", href: "/my-countdowns", icon: Bookmark },
];
export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tracker = useTracker();
  const theme = tracker.data.preferences.theme;
  const light = theme === "light";
  const pathname = usePathname();
  const watchlist = useWatchlist();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function toggleTheme() {
    tracker.setPreferences({
      theme: theme === "dark" ? "light" : theme === "light" ? "system" : "dark",
    });
  }
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <nav
          aria-label="Main navigation"
          className="page-shell flex h-20 items-center justify-between gap-4"
        >
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Cinecount home"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-on-accent">
              <Clapperboard size={21} aria-hidden="true" />
            </span>
            <span className="text-xl font-semibold tracking-[-0.05em]">
              cinecount<span className="text-muted">.</span>
            </span>
          </Link>
          <div className="hidden items-center gap-1 lg:flex">
            {links.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                prefetch={href === "/my-countdowns" ? false : undefined}
                aria-current={pathname === href ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-surface-raised text-foreground"
                    : "text-muted hover:text-foreground",
                )}
              >
                {label}
                {href === "/my-countdowns" && watchlist.ids.length > 0 ? (
                  <span className="text-xs text-muted">
                    {watchlist.ids.length}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              aria-label="Open search"
              variant="ghost"
              onClick={() => {
                setMenuOpen(false);
                setSearchOpen(true);
              }}
              className="h-11 w-11 px-0 xl:w-auto xl:gap-8 xl:border xl:border-border xl:px-4"
            >
              <span className="flex items-center gap-2">
                <Search size={18} aria-hidden="true" />
                <span className="hidden xl:inline">Find a title</span>
              </span>
              <kbd className="hidden text-xs text-muted xl:inline">⌘ K</kbd>
            </Button>
            <Button
              aria-label={`Theme: ${theme}. Change theme`}
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
            >
              {theme === "system" ? (
                <Monitor size={18} aria-hidden="true" />
              ) : light ? (
                <Moon size={18} aria-hidden="true" />
              ) : (
                <Sun size={18} aria-hidden="true" />
              )}
            </Button>
            <Show when="signed-out">
              <Link href="/login" className="action-link hidden sm:inline-flex">
                Sign in <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </Show>
            <Link
              href="/profile"
              aria-label="Profile and settings"
              className="hidden h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface-raised sm:inline-flex"
            >
              <UserRound size={18} aria-hidden="true" />
            </Link>
            <Show when="signed-in">
              <UserButton />
            </Show>
            <Button
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              size="icon"
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? (
                <X size={21} aria-hidden="true" />
              ) : (
                <Menu size={21} aria-hidden="true" />
              )}
            </Button>
          </div>
        </nav>
        {menuOpen ? (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="page-shell grid max-h-[calc(100dvh_-_5rem)] gap-1 overflow-y-auto border-t border-border py-4 lg:hidden"
          >
            {links.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium",
                  pathname === href ? "bg-surface-raised" : "text-muted",
                )}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            ))}
            {[
              { label: "Airing Soon", href: "/soon", icon: Clock3 },
              { label: "Upcoming", href: "/upcoming", icon: Clapperboard },
              {
                label: "Season premieres",
                href: "/season-premieres",
                icon: Clapperboard,
              },
              { label: "Recently aired", href: "/aired", icon: Flame },
              { label: "Trending", href: "/trending", icon: Flame },
              { label: "Profile", href: "/profile", icon: UserRound },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm text-muted"
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            ))}
            <Show when="signed-out">
              <Link
                href="/login"
                className="action-link mt-3"
                onClick={() => setMenuOpen(false)}
              >
                Sign in <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </Show>
          </nav>
        ) : null}
      </header>
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
