"use client";

import { CollectionGrid } from "@/components/media/collection-grid";
import { useCollection } from "@/hooks/use-collection";

export function SharedCollection({ ids }: { ids: string[] }) {
  const collection = useCollection(ids);
  return <CollectionGrid entries={collection.entries} loading={collection.loading} onRetry={collection.refresh} />;
}
