import type { Metadata } from "next";
import { MediaGrid } from "@/components/media/media-grid";
import { getAllTitles } from "@/lib/tmdb/service";

export const metadata: Metadata = { title: "Shared List" };

export default async function SharedListPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids = "" } = await searchParams;
  const wanted = new Set(ids.split(",").filter(Boolean).slice(0, 50));
  const items = (await getAllTitles()).filter((item) => wanted.has(item.id));
  return (
    <section className="page-shell page-section">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-foreground">
        Shared collection
      </p>
      <h1 className="mt-2 text-4xl font-semibold text-foreground sm:text-6xl">
        A Cinecount list
      </h1>
      <p className="mt-4 text-muted">{items.length} titles shared with you.</p>
      <div className="mt-8">
        {items.length ? (
          <MediaGrid items={items} />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-8 text-muted">
            This list is empty or its titles have left the current catalog.
          </div>
        )}
      </div>
    </section>
  );
}
