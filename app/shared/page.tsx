import type { Metadata } from "next";
import { SharedCollection } from "@/components/media/shared-collection";

export const metadata: Metadata = { title: "Shared List" };

export default async function SharedListPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { ids = "" } = await searchParams;
  const wanted = [...new Set((Array.isArray(ids) ? ids : [ids]).flatMap((value) => value.split(",").filter(Boolean)))];
  return (
    <section className="page-shell page-section">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-foreground">
        Shared collection
      </p>
      <h1 className="mt-2 text-4xl font-semibold text-foreground sm:text-6xl">
        A Cinecount list
      </h1>
      <p className="mt-4 text-muted">{wanted.length} {wanted.length === 1 ? "title" : "titles"} shared with you.</p>
      <div className="mt-8">
        {wanted.length ? (
          <SharedCollection ids={wanted} />
        ) : (
          <div className="rounded-xl border border-border bg-surface p-8 text-muted">
            This shared list is empty.
          </div>
        )}
      </div>
    </section>
  );
}
