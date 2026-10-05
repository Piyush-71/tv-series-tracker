import type { Metadata } from "next";
import { PageHeading } from "@/components/layout/page-heading";
import { Suspense } from "react";
import { ExploreClient } from "@/components/media/explore-client";
import { getBrowseOptions } from "@/lib/browse/service";

export const metadata: Metadata = {
  title: "Explore",
  description:
    "Discover new series, returning seasons, anime, and movies by country, genre, premiere date, and rating.",
};

export default async function ExplorePage() {
  const options = await getBrowseOptions();

  return (
    <section className="page-shell page-section">
      <PageHeading
        eyebrow="The collection"
        title="Explore premieres"
        description="Follow your curiosity. Find new series, returning seasons, and movies by country, genre, date, and rating."
      />
      <Suspense
        fallback={<p className="py-10 text-muted">Loading browse controls…</p>}
      >
        <ExploreClient options={options} />
      </Suspense>
    </section>
  );
}
