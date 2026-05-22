import { NextResponse } from "next/server";
import { searchTitles } from "@/lib/tmdb/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const results = await searchTitles(query);

  return NextResponse.json({ results });
}
