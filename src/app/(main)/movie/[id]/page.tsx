import { notFound } from "next/navigation";
import {
  fetchMovieDetails,
  fetchExternalIds,
  fetchTrailerKey,
  tmdbPosterUrl,
  tmdbBackdropUrl,
} from "@/lib/tmdb";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { FavoriteButton } from "@/components/movie/FavoriteButton";
import { HistoryLogger } from "@/components/movie/HistoryLogger";
import { CreateRoomButton } from "@/components/room/CreateRoomButton";
import { PLAYER_SOURCES } from "@/lib/player-sources";

// Next.js 16: params у страницы — Promise, обязательно await
export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tmdbId = Number(id);

  if (!Number.isFinite(tmdbId)) {
    notFound();
  }

  const details = await fetchMovieDetails(tmdbId);
  if (!details) {
    notFound();
  }

  const [externalIds, trailerKey] = await Promise.all([fetchExternalIds(tmdbId), fetchTrailerKey(tmdbId)]);

  const posterUrl = tmdbPosterUrl(details.poster_path);
  const backdropUrl = tmdbBackdropUrl(details.backdrop_path);
  const year = details.release_date ? Number(details.release_date.slice(0, 4)) : undefined;

  const libraryRef = { tmdbId: details.id, title: details.title, posterUrl };
  const playerMovie = {
    tmdbId: details.id,
    title: details.title,
    year,
    imdbId: externalIds.imdbId ?? undefined,
  };

  return (
    <div>
      {backdropUrl && (
        <div className="relative h-[36vh] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backdropUrl} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <HistoryLogger movie={libraryRef} />

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">{details.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
              {year && <span>{year}</span>}
              {details.runtime ? <span>· {details.runtime} мин</span> : null}
              <span>· ★ {details.vote_average.toFixed(1)}</span>
              {details.genres.map((genre) => (
                <span key={genre.id} className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs">
                  {genre.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FavoriteButton movie={libraryRef} />
            <CreateRoomButton movie={libraryRef} />
          </div>
        </div>

        <VideoPlayer
          movie={playerMovie}
          posterUrl={posterUrl}
          trailerYoutubeKey={trailerKey}
          sources={PLAYER_SOURCES}
        />

        <p className="mt-6 max-w-3xl leading-relaxed text-neutral-300">
          {details.overview || "Описание отсутствует."}
        </p>
      </div>
    </div>
  );
}
