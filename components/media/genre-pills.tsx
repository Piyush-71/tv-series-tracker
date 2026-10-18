import Link from "next/link";
export function GenrePills({ genres }: { genres: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <Link
          key={genre}
          href={`/category/${genre.toLowerCase().replaceAll(" ", "-")}`}
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-xs font-medium transition-colors hover:bg-surface-raised"
        >
          {genre}
        </Link>
      ))}
    </div>
  );
}
