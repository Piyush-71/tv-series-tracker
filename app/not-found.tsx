import Link from "next/link";
import { Film } from "lucide-react";

export default function NotFound() {
  return (
    <section className="page-shell page-section grid min-h-[70svh] place-items-center text-center">
      <div>
        <Film className="mx-auto text-foreground" size={42} />
        <h1 className="mt-4 text-4xl font-semibold text-foreground">
          That title left the schedule.
        </h1>
        <p className="mt-3 text-muted">
          The page may have moved, or the release is no longer in the catalog.
        </p>
        <Link href="/explore" className="action-link mt-6">
          Explore releases
        </Link>
      </div>
    </section>
  );
}
