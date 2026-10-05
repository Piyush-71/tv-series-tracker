import { SearchX } from "lucide-react";
import Link from "next/link";
import type { MediaTitle } from "@/types/media";
import { MediaCard } from "@/components/media/media-card";
export function MediaGrid({
  items,
  ranked = false,
}: {
  items: MediaTitle[];
  ranked?: boolean;
}) {
  if (!items.length)
    return (
      <div className="empty-state">
        <SearchX
          size={28}
          className="mx-auto mb-5 text-muted"
          aria-hidden="true"
        />
        <h2 className="text-xl font-semibold">No titles found</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Try a different search or explore the full collection.
        </p>
        <Link href="/explore" className="secondary-link mt-6">
          Explore titles
        </Link>
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5">
      {items.map((item, index) => (
        <MediaCard
          key={item.id}
          title={item}
          rank={ranked ? index + 1 : undefined}
        />
      ))}
    </div>
  );
}
