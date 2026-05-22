import { NextResponse } from "next/server";
import { getTitlesByQuery } from "@/lib/tmdb/service";
import type { MediaType } from "@/types/media";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as MediaType | "all" | null;
  const genre = searchParams.get("genre") ?? undefined;
  const query = searchParams.get("q") ?? undefined;

  const titles = await getTitlesByQuery({
    type: type ?? "all",
    genre,
    query,
  });

  return NextResponse.json({ results: titles });
}
