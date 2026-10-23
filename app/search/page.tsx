import type { Metadata } from "next";
import { Search } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { MediaGrid } from "@/components/media/media-grid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchCatalog } from "@/lib/catalog";
type Props = { searchParams: Promise<{ q?: string }> };
export const metadata: Metadata = { title: "Search" };
export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const { results, partial } = await searchCatalog(q);
  return (
    <section className="page-shell page-section">
      <PageHeading
        eyebrow="Seek and discover"
        title={q ? `Results for “${q}”` : "Find your next story."}
        description={`${results.length} ${results.length === 1 ? "title" : "titles"} found. Search movies, Western series, and Asian dramas.`}
      />
      <form
        action="/search"
        className="mb-9 flex max-w-2xl flex-wrap items-end gap-3"
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="page-search"
            className="mb-2 block text-sm text-muted"
          >
            Search titles
          </label>
          <Input
            id="page-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search movies, series, or Asian dramas"
            maxLength={100}
          />
        </div>
        <Button type="submit" size="lg">
          <Search size={17} aria-hidden="true" />
          Search
        </Button>
      </form>
      {partial ? (
        <p role="status" className="mb-6 text-sm text-muted">
          Some results are temporarily unavailable. Showing titles from the available source. Search again to retry.
        </p>
      ) : null}
      <MediaGrid items={results} />
    </section>
  );
}
