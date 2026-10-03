"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bookmark, LogIn, Menu, Monitor, Moon, Search, Sun, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchOverlay } from "@/components/search/search-overlay";
import { useTracker } from "@/hooks/use-tracker";

const links = [
  ["Airing Soon", "/soon"],
  ["Upcoming", "/upcoming"],
  ["Premieres", "/season-premieres"],
  ["Recently Aired", "/aired"],
  ["Explore", "/explore"],
];

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tracker = useTracker();
  const theme = tracker.data.preferences.theme;

  function cycleTheme() {
    const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    tracker.setPreferences({ theme: next });
    const light = next === "light" || (next === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
    document.documentElement.classList.toggle("light", light);
    document.documentElement.dataset.theme = next;
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-black/65 backdrop-blur-2xl">
        <nav className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Cinecount home">
            <span className="cinematic grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-blue-500 to-rose-500 font-black text-white shadow-[0_0_28px_rgba(124,58,237,0.55)]">
              C
            </span>
            <span className="text-lg font-black tracking-wide text-white">Cinecount</span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                prefetch={href === "/watchlist" ? false : undefined}
                className="text-sm font-semibold text-zinc-300 transition hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button aria-label="Open search" size="icon" variant="secondary" onClick={() => setSearchOpen(true)}>
              <Search size={18} />
            </Button>
            <Link href="/my-countdowns" prefetch={false} className="hidden sm:contents">
              <Button aria-label="Open My Countdowns" size="icon" variant="secondary">
                <Bookmark size={18} />
              </Button>
            </Link>
            <Link href="/profile#reminders" className="hidden sm:contents">
              <Button aria-label="Notification settings" size="icon" variant="secondary">
              <Bell size={18} />
              </Button>
            </Link>
            <Button aria-label={`Theme: ${theme}. Change theme`} size="icon" variant="secondary" onClick={cycleTheme}>
              {theme === "dark" ? <Moon size={18} /> : theme === "light" ? <Sun size={18} /> : <Monitor size={18} />}
            </Button>
            <Show when="signed-out">
              <SignInButton mode="modal" fallbackRedirectUrl="/">
                <Button size="sm" className="px-3">
                  <LogIn size={17} className="sm:hidden" />
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-10 w-10 ring-1 ring-white/15",
                    userButtonPopoverCard:
                      "border border-white/10 bg-zinc-950 text-white shadow-2xl",
                    userButtonPopoverActionButton: "text-zinc-200 hover:bg-white/10",
                    userButtonPopoverActionButtonText: "text-zinc-200",
                    userButtonPopoverFooter: "hidden",
                  },
                }}
              />
            </Show>
            <Button aria-label={menuOpen ? "Close menu" : "Open menu"} size="icon" variant="ghost" className="md:hidden" onClick={() => setMenuOpen((value) => !value)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </nav>
      </header>
      <AnimatePresence>
        {menuOpen ? (
          <motion.nav
            className="fixed inset-x-3 top-20 z-40 rounded-xl border border-white/12 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-2xl md:hidden"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            aria-label="Mobile navigation"
          >
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                prefetch={href === "/watchlist" || href === "/profile" ? false : undefined}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/10 hover:text-white"
              >
                {label}
                {label === "Profile" ? <UserRound size={17} /> : null}
              </Link>
            ))}
            <Link
              href="/my-countdowns"
              prefetch={false}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/10 hover:text-white"
            >
              My Countdowns <Bookmark size={17} />
            </Link>
            <Link
              href="/calendar"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/10 hover:text-white"
            >
              Calendar
            </Link>
            <Link
              href="/profile"
              prefetch={false}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/10 hover:text-white"
            >
              Profile <UserRound size={17} />
            </Link>
          </motion.nav>
        ) : null}
      </AnimatePresence>
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
