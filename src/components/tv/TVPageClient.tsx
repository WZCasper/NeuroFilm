"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { FavoriteButton } from "@/components/movie/FavoriteButton";
import { HistoryLogger } from "@/components/movie/HistoryLogger";
import { PLAYER_SOURCES } from "@/lib/player-sources";

export interface TVDetailsView {
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  year?: number;
  rating: number;
  genres: string[];
  numberOfSeasons: number;
  imdbId?: string;
  trailerKey: string | null;
}

interface TVEpisode {
  episodeNumber: number;
  name: string;
}

export function TVPageClient({ details }: { details: TVDetailsView }) {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState<TVEpisode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  useEffect(() => {
    // Старт асинхронной загрузки — тот же легитимный паттерн, что и в
    // VideoPlayer.tsx и HomeContent.tsx
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingEpisodes(true);
    fetch(`/api/tmdb/tv-season?tmdbId=${details.tmdbId}&season=${selectedSeason}`)
      .then((res) => res.json())
      .then((data: { episodes?: TVEpisode[] }) => setEpisodes(data.episodes ?? []))
      .catch((err: unknown) => console.error("Ошибка загрузки списка серий:", err))
      .finally(() => setIsLoadingEpisodes(false));
  }, [details.tmdbId, selectedSeason]);

  // Производное значение вместо повторного эффекта: если выбранной ранее
  // серии нет в новом сезоне (например, сезон короче) — используем первую
  // доступную, не трогая сам selectedEpisode
  const effectiveEpisode = episodes.some((e) => e.episodeNumber === selectedEpisode)
    ? selectedEpisode
    : (episodes[0]?.episodeNumber ?? selectedEpisode);

  const libraryRef = {
    mediaType: "tv" as const,
    tmdbId: details.tmdbId,
    title: details.title,
    posterUrl: details.posterUrl,
  };

  const playerMedia = {
    mediaType: "tv" as const,
    tmdbId: details.tmdbId,
    title: details.title,
    year: details.year,
    imdbId: details.imdbId,
    season: selectedSeason,
    episode: effectiveEpisode,
  };

  const seasonNumbers = Array.from({ length: details.numberOfSeasons }, (_, i) => i + 1);

  return (
    <div>
      {details.backdropUrl && (
        <div className="relative h-[36vh] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={details.backdropUrl} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <HistoryLogger media={libraryRef} />

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">{details.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
              {details.year && <span>{details.year}</span>}
              <span>· {details.numberOfSeasons} сезон(ов)</span>
              <span>· ★ {details.rating.toFixed(1)}</span>
              {details.genres.map((genre) => (
                <span key={genre} className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs">
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <FavoriteButton media={libraryRef} />
        </div>

        {/* Выбор сезона — по данным TMDB, не по тому, что нашлось у конкретного балансера */}
        <div className="mb-3 flex flex-wrap gap-2">
          {seasonNumbers.map((season) => (
            <button
              key={season}
              type="button"
              onClick={() => setSelectedSeason(season)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                season === selectedSeason
                  ? "bg-nf-yellow text-black"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              Сезон {season}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-1.5">
          {isLoadingEpisodes ? (
            <Loader2 className="h-5 w-5 animate-spin text-nf-yellow" />
          ) : (
            episodes.map((ep) => (
              <button
                key={ep.episodeNumber}
                type="button"
                onClick={() => setSelectedEpisode(ep.episodeNumber)}
                title={ep.name}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  ep.episodeNumber === effectiveEpisode
                    ? "bg-nf-yellow text-black"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {ep.episodeNumber}
              </button>
            ))
          )}
        </div>

        <VideoPlayer
          media={playerMedia}
          posterUrl={details.posterUrl}
          trailerYoutubeKey={details.trailerKey}
          sources={PLAYER_SOURCES}
        />

        <p className="mt-6 max-w-3xl leading-relaxed text-neutral-300">
          {details.overview || "Описание отсутствует."}
        </p>
      </div>
    </div>
  );
}
