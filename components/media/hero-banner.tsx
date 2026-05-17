"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Bell, Play, Plus } from "lucide-react";
import { useState } from "react";
import type { MediaTitle } from "@/types/media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/media/countdown-timer";
import { TrailerModal } from "@/components/media/trailer-modal";
import { GenrePills } from "@/components/media/genre-pills";
import { formatReleaseDate } from "@/lib/utils";
import { useWatchlist } from "@/hooks/use-watchlist";

export function HeroBanner({ title }: { title: MediaTitle }) {
  const [open, setOpen] = useState(false);
  const watchlist = useWatchlist();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, 120]);
  const opacity = useTransform(scrollY, [0, 620], [1, 0.35]);

  return (
    <section className="relative min-h-[92svh] overflow-hidden">
      <motion.img
        src={title.backdrop}
        alt=""
        style={{ y, opacity }}
        className="absolute inset-0 h-full w-full scale-105 object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#020205_0%,rgba(2,2,5,0.72)_38%,rgba(2,2,5,0.24)_74%),linear-gradient(0deg,#020205_0%,transparent_36%,rgba(2,2,5,0.35)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_30%,rgba(124,58,237,0.32),transparent_26%),radial-gradient(circle_at_80%_22%,rgba(225,29,72,0.20),transparent_28%)]" />
      <div className="relative z-10 flex min-h-[92svh] items-end px-4 pb-16 pt-28 sm:px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="border-violet-300/40 bg-violet-500/20 text-violet-100">
              Featured Countdown
            </Badge>
            <Badge>{title.platform}</Badge>
            <Badge>{formatReleaseDate(title.releaseDate)}</Badge>
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.95] text-white sm:text-7xl lg:text-8xl">
            {title.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg">
            {title.description}
          </p>
          <div className="mt-5">
            <GenrePills genres={title.genres} />
          </div>
          <div className="mt-7 max-w-xl">
            <CountdownTimer releaseDate={title.releaseDate} />
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setOpen(true)}>
              <Play size={19} fill="currentColor" />
              Watch Trailer
            </Button>
            <Button size="lg" variant="secondary">
              <Bell size={19} />
              Notify Me
            </Button>
            <Button size="lg" variant="secondary" onClick={() => watchlist.toggle(title.id)}>
              <Plus size={19} />
              Watchlist
            </Button>
          </div>
        </motion.div>
      </div>
      <TrailerModal open={open} onOpenChange={setOpen} trailerUrl={title.trailerUrl} title={title.title} />
    </section>
  );
}
