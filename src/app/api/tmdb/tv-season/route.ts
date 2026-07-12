import { NextRequest, NextResponse } from "next/server";
import { fetchTVSeasonEpisodes } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const tmdbId = Number(request.nextUrl.searchParams.get("tmdbId"));
  const season = Number(request.nextUrl.searchParams.get("season"));

  if (!Number.isFinite(tmdbId) || !Number.isFinite(season)) {
    return NextResponse.json({ episodes: [] });
  }

  const episodes = await fetchTVSeasonEpisodes(tmdbId, season);
  return NextResponse.json({
    episodes: episodes.map((e) => ({ episodeNumber: e.episode_number, name: e.name })),
  });
}
