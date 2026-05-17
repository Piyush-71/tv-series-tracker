import Link from "next/link";
import type { MediaTitle } from "@/types/media";
import { MediaCard } from "@/components/media/media-card";

export function CarouselSection({
  title,
  eyebrow,
  items,
  href,
}: {
  title: string;
  eyebrow?: string;
  items: MediaTitle[];
  href?: string;
}) {
  return (
    <section className="space-y-4 px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">{title}</h2>
        </div>
        {href ? (
          <Link href={href} className="text-sm font-semibold text-zinc-300 transition hover:text-white">
            View all
          </Link>
        ) : null}
      </div>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-4">
        {items.map((item) => (
          <MediaCard key={item.id} title={item} />
        ))}
      </div>
    </section>
  );
}
