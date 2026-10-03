import type { Metadata } from "next";
import { MediaGrid } from "@/components/media/media-grid";
import { getAllTitles } from "@/lib/tmdb/service";

export const metadata: Metadata = { title: "Shared List" };

export default async function SharedListPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids = "" } = await searchParams;
  const wanted = new Set(ids.split(",").filter(Boolean).slice(0, 50));
  const items = (await getAllTitles()).filter((item) => wanted.has(item.id));
  return (
    <section className="px-4 pb-16 pt-28 sm:px-6 lg:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Shared collection</p>
      <h1 className="mt-2 text-4xl font-black text-white sm:text-6xl">A Cinecount list</h1>
      <p className="mt-4 text-zinc-400">{items.length} titles shared with you.</p>
      <div className="mt-8">{items.length ? <MediaGrid items={items} /> : <div className="rounded-xl border border-white/10 bg-white/[0.055] p-8 text-zinc-400">This list is empty or its titles have left the current catalog.</div>}</div>
    </section>
  );
}
