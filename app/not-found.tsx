import Link from "next/link";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="grid min-h-[70svh] place-items-center px-4 pb-16 pt-28 text-center">
      <div>
        <Film className="mx-auto text-violet-300" size={42} />
        <h1 className="mt-4 text-4xl font-black text-white">That title left the schedule.</h1>
        <p className="mt-3 text-zinc-400">The page may have moved, or the release is no longer in the catalog.</p>
        <Link href="/explore" className="mt-6 inline-block"><Button>Explore releases</Button></Link>
      </div>
    </section>
  );
}
