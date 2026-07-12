import { notFound } from "next/navigation";
import {
  fetchTVDetails,
  fetchTVExternalIds,
  fetchTrailerKey,
  tmdbPosterUrl,
  tmdbBackdropUrl,
} from "@/lib/tmdb";
import { TVPageClient } from "@/components/tv/TVPageClient";

// Next.js 16: params у страницы — Promise, обязательно await
export default async function TVPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = Number(id);

  if (!Number.isFinite(tmdbId)) {
    notFound();
  }

  const details = await fetchTVDetails(tmdbId);
  if (!details) {
    notFound();
  }

  const [externalIds, trailerKey] = await Promise.all([
    fetchTVExternalIds(tmdbId),
    fetchTrailerKey(tmdbId, "tv"),
  ]);

  return (
    <TVPageClient
      details={{
        tmdbId: details.id,
        title: details.name,
        overview: details.overview,
        posterUrl: tmdbPosterUrl(details.poster_path),
        backdropUrl: tmdbBackdropUrl(details.backdrop_path),
        year: details.first_air_date ? Number(details.first_air_date.slice(0, 4)) : undefined,
        rating: details.vote_average,
        genres: details.genres.map((g) => g.name),
        numberOfSeasons: details.number_of_seasons,
        imdbId: externalIds.imdbId ?? undefined,
        trailerKey,
      }}
    />
  );
}
