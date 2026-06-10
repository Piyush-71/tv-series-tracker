"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Bell, Bookmark, LogIn, Menu, Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchOverlay } from "@/components/search/search-overlay";

const links = [
  ["Explore", "/explore"],
  ["Trending", "/trending"],
  ["Anime", "/category/anime"],
  ["Movies", "/category/movie"],
  ["Watchlist", "/watchlist"],
];

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-black/35 backdrop-blur-2xl">
        <nav className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Cinecount home">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-blue-500 to-rose-500 font-black text-white shadow-[0_0_28px_rgba(124,58,237,0.55)]">
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
            <Link href="/watchlist" prefetch={false} className="hidden sm:contents">
              <Button aria-label="Open watchlist" size="icon" variant="secondary">
                <Bookmark size={18} />
              </Button>
            </Link>
            <Button aria-label="Notifications" size="icon" variant="secondary">
              <Bell size={18} />
            </Button>
            <Button aria-label="Toggle theme" size="icon" variant="secondary" onClick={() => setLight((value) => !value)}>
              {light ? <Moon size={18} /> : <Sun size={18} />}
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
            <Button aria-label="Menu" size="icon" variant="ghost" className="md:hidden">
              <Menu size={20} />
            </Button>
          </div>
        </nav>
      </header>
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
