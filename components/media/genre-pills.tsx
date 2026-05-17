import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function GenrePills({ genres }: { genres: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <Link key={genre} href={`/category/${genre.toLowerCase().replaceAll(" ", "-")}`}>
          <Badge className="transition hover:border-violet-300/60 hover:bg-violet-400/15">
            {genre}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
