import { NextRequest, NextResponse } from "next/server";
import { fetchMultiSearch, tmdbPosterUrl } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const items = await fetchMultiSearch(query);

  const results = items.slice(0, 12).map((item) => {
    const isTv = item.media_type === "tv";
    const dateStr = isTv ? item.first_air_date : item.release_date;
    return {
      mediaType: item.media_type,
      tmdbId: item.id,
      title: isTv ? item.name ?? "" : item.title ?? "",
      year: dateStr ? Number(dateStr.slice(0, 4)) : undefined,
      posterUrl: tmdbPosterUrl(item.poster_path, "w342"),
    };
  });

  return NextResponse.json({ results });
}
