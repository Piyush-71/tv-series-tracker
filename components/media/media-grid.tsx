import type { MediaTitle } from "@/types/media";
import { MediaCard } from "@/components/media/media-card";

export function MediaGrid({ items }: { items: MediaTitle[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
      {items.map((item) => (
        <MediaCard key={item.id} title={item} />
      ))}
    </div>
  );
}
