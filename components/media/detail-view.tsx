"use client";

import { motion } from "framer-motion";
import { Bell, Bookmark, Play, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { MediaTitle } from "@/types/media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/media/countdown-timer";
import { TrailerModal } from "@/components/media/trailer-modal";
import { GenrePills } from "@/components/media/genre-pills";
import { CarouselSection } from "@/components/media/carousel-section";
import { formatReleaseDate } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-watchlist";

export function DetailView({
  title,
  similar,
}: {
  title: MediaTitle;
  similar: MediaTitle[];
}) {
  const [open, setOpen] = useState(false);
  const watchlist = useWatchlist();
  const saved = watchlist.has(title.id);

  return (
    <>
      <section className="relative min-h-[78svh] overflow-hidden px-4 pb-12 pt-28 sm:px-6 lg:px-10">
        <Image src={title.backdrop} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#020205_0%,rgba(2,2,5,0.82)_45%,rgba(2,2,5,0.34)_100%),linear-gradient(0deg,#020205_0%,transparent_42%)]" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 grid min-h-[62svh] items-end gap-8 lg:grid-cols-[320px_1fr]"
        >
          <div className="relative hidden aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/12 shadow-2xl lg:block">
            <Image src={title.poster} alt={`${title.title} poster`} fill sizes="320px" className="object-cover" />
          </div>
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="capitalize">{title.type}</Badge>
              <Badge>{title.platform}</Badge>
              <Badge>{formatReleaseDate(title.releaseDate)}</Badge>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-300">
                <Star size={16} fill="currentColor" />
                {title.rating.toFixed(1)}
              </span>
            </div>
            <h1 className="text-5xl font-black leading-none text-white sm:text-7xl">{title.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-200">{title.description}</p>
            <div className="mt-5">
              <GenrePills genres={title.genres} />
            </div>
            <div className="mt-7 max-w-xl">
              <CountdownTimer releaseDate={title.releaseDate} />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setOpen(true)}>
                <Play size={18} fill="currentColor" />
                Trailer
              </Button>
              <Button size="lg" variant="secondary">
                <Bell size={18} />
                Notify Me
              </Button>
              <Button size="lg" variant={saved ? "danger" : "secondary"} onClick={() => watchlist.toggle(title.id)}>
                <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-10">
        <div>
          <h2 className="text-2xl font-black text-white">Synopsis</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-300">{title.description}</p>
          <h2 className="mt-10 text-2xl font-black text-white">Cast</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {title.cast.map((person) => (
              <div key={person.name} className="rounded-lg border border-white/10 bg-white/[0.055] p-3">
                <div className="relative aspect-square overflow-hidden rounded-md">
                  <Image src={person.image} alt={person.name} fill sizes="(max-width: 768px) 45vw, 220px" className="object-cover" />
                </div>
                <h3 className="mt-3 font-bold text-white">{person.name}</h3>
                <p className="text-sm text-zinc-400">{person.role}</p>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-lg border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
          <h2 className="text-lg font-black text-white">Streaming</h2>
          <div className="mt-4 grid gap-3">
            <Badge className="justify-center py-3 text-sm">{title.platform}</Badge>
            <Badge className="justify-center py-3 text-sm">4K HDR</Badge>
            <Badge className="justify-center py-3 text-sm">Trailer Available</Badge>
          </div>
        </aside>
      </section>

      <CarouselSection title="Similar Recommendations" items={similar} />
      <TrailerModal open={open} onOpenChange={setOpen} trailerUrl={title.trailerUrl} title={title.title} />
    </>
  );
}
