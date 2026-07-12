"use client";

import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { HeroBanner, type HeroMovie } from "@/components/home/HeroBanner";
import { GenreFilter } from "@/components/home/GenreFilter";
import { MovieRow, type MovieRowItem } from "@/components/home/MovieRow";
import { MoviePosterGrid } from "@/components/movie/MoviePosterGrid";

interface Genre {
  id: number;
  name: string;
}

interface HomeContentProps {
  heroMovies: HeroMovie[];
  genres: Genre[];
  popular: MovieRowItem[];
  topRated: MovieRowItem[];
  upcoming: MovieRowItem[];
  nowPlaying: MovieRowItem[];
}

interface TmdbSearchApiResult {
  mediaType: "movie" | "tv";
  tmdbId: number;
  title: string;
  posterUrl: string | null;
}

const SEARCH_DEBOUNCE_MS = 400;

export function HomeContent({ heroMovies, genres, popular, topRated, upcoming, nowPlaying }: HomeContentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MovieRowItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeGenreId, setActiveGenreId] = useState<number | null>(null);
  const [genreResults, setGenreResults] = useState<MovieRowItem[]>([]);
  const [isLoadingGenre, setIsLoadingGenre] = useState(false);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const trimmed = searchTerm.trim();
    if (!trimmed) return; // ниже isSearchMode сам учитывает пустой ввод

    searchDebounceRef.current = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/tmdb/search-multi?query=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data: { results?: TmdbSearchApiResult[] }) => {
          const results = (data.results ?? []).map((r) => ({
            tmdbId: r.tmdbId,
            title: r.title,
            posterUrl: r.posterUrl ?? "",
            mediaType: r.mediaType,
          }));
          setSearchResults(results);
        })
        .catch((err: unknown) => console.error("Ошибка поиска:", err))
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (activeGenreId === null) return; // ниже рендер сам учитывает "жанр не выбран"

    // Тот же паттерн "старт асинхронной загрузки в эффекте", что и в
    // VideoPlayer.tsx — синхронно фиксируем "идёт загрузка" и сразу
    // запускаем fetch ниже. Экспериментальное правило react-hooks/
    // set-state-in-effect помечает это независимо от того, что дальше
    // идёт реальный асинхронный запрос.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingGenre(true);
    fetch(`/api/tmdb/genre?id=${activeGenreId}`)
      .then((res) => res.json())
      .then((data: { results?: MovieRowItem[] }) => setGenreResults(data.results ?? []))
      .catch((err: unknown) => console.error("Ошибка загрузки жанра:", err))
      .finally(() => setIsLoadingGenre(false));
  }, [activeGenreId]);

  const trimmedSearchTerm = searchTerm.trim();
  const isSearchMode = trimmedSearchTerm.length > 0;

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-8">
        <HeroBanner movies={heroMovies} />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <div className="relative mb-6 max-w-xl">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Найти фильм…"
            className="w-full rounded-xl bg-neutral-900 py-3 pl-10 pr-4 text-white outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-nf-yellow"
          />
        </div>

        {isSearchMode ? (
          <>
            {isSearching && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-nf-yellow" />
              </div>
            )}
            {!isSearching && searchResults.length === 0 && <p className="text-neutral-500">Ничего не найдено.</p>}
            {!isSearching && searchResults.length > 0 && <MoviePosterGrid items={searchResults} />}
          </>
        ) : (
          <>
            <div className="mb-6">
              <GenreFilter genres={genres} activeGenreId={activeGenreId} onSelect={setActiveGenreId} />
            </div>

            {activeGenreId !== null ? (
              isLoadingGenre ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-nf-yellow" />
                </div>
              ) : genreResults.length === 0 ? (
                <p className="text-neutral-500">В этом жанре пока ничего не нашлось.</p>
              ) : (
                <MoviePosterGrid items={genreResults} />
              )
            ) : (
              <>
                <MovieRow title="Популярное" items={popular} />
                <MovieRow title="Топ рейтинга" items={topRated} />
                <MovieRow title="Скоро на экранах" items={upcoming} />
                <MovieRow title="Сейчас в кино" items={nowPlaying} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
