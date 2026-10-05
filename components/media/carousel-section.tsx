"use client";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type { MediaTitle } from "@/types/media";
import { MediaCard } from "@/components/media/media-card";
import { Button } from "@/components/ui/button";
export function CarouselSection({
  title,
  eyebrow,
  items,
  href,
  ranked = false,
}: {
  title: string;
  eyebrow?: string;
  items: MediaTitle[];
  href?: string;
  ranked?: boolean;
}) {
  const rail = useRef<HTMLDivElement>(null);
  if (!items.length) return null;
  function scroll(direction: number) {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    rail.current?.scrollBy({
      left: direction * rail.current.clientWidth * 0.8,
      behavior: reduced ? "instant" : "smooth",
    });
  }
  return (
    <section className="page-shell py-7 sm:py-9" aria-label={title}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <h2 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {href ? (
            <Link
              href={href}
              aria-label={`View all ${title.toLowerCase()}`}
              className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-muted hover:text-foreground sm:mr-3 sm:text-sm"
            >
              View all <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : null}
          <Button
            size="icon"
            variant="secondary"
            aria-label={`Scroll ${title} left`}
            className="hidden sm:inline-flex"
            onClick={() => scroll(-1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            aria-label={`Scroll ${title} right`}
            className="hidden sm:inline-flex"
            onClick={() => scroll(1)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div
        ref={rail}
        tabIndex={0}
        aria-label={`${title} titles; scroll for more`}
        className="no-scrollbar grid auto-cols-[160px] grid-flow-col gap-4 overflow-x-auto px-1 pb-3 pt-1 sm:auto-cols-[200px] sm:gap-5 lg:auto-cols-[calc((100%_-_5rem)/5)]"
      >
        {items.map((item, index) => (
          <MediaCard
            key={item.id}
            title={item}
            rank={ranked ? index + 1 : undefined}
          />
        ))}
      </div>
    </section>
  );
}
