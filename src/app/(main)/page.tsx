"use client";

import { useState, useEffect, useRef } from "react";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import { MoviePosterGrid } from "@/components/movie/MoviePosterGrid";

interface TmdbSearchResult {
  tmdbId: number;
  title: string;
  year?: number;
  posterUrl: string | null;
}

const SEARCH_DEBOUNCE_MS = 400;

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = searchTerm.trim();
    if (!trimmed) return; // ниже displayResults сам учитывает пустой ввод

    debounceRef.current = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/tmdb/search?query=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => setResults(data.results ?? []))
        .catch((err: unknown) => console.error("Ошибка поиска:", err))
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const trimmedSearchTerm = searchTerm.trim();
  const displayResults = trimmedSearchTerm ? results : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <section className="mb-8">
        <h1 className="mb-2 text-3xl font-extrabold">
          NEURO<span className="text-nf-yellow">FILM</span>
        </h1>
        <p className="mb-6 max-w-2xl text-neutral-400">
          Витрина с hero-баннером, жанрами и подборками — следующий шаг миграции. Пока фильм
          можно найти поиском ниже.
        </p>

        <div className="relative max-w-xl">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Найти фильм…"
            className="w-full rounded-xl bg-neutral-900 py-3 pl-10 pr-4 text-white outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-nf-yellow"
          />
        </div>
      </section>

      {isSearching && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-nf-yellow" />
        </div>
      )}

      {!isSearching && trimmedSearchTerm && displayResults.length === 0 && (
        <p className="text-neutral-500">Ничего не найдено.</p>
      )}

      {!isSearching && displayResults.length > 0 && (
        <MoviePosterGrid
          items={displayResults.map((r) => ({ tmdbId: r.tmdbId, title: r.title, posterUrl: r.posterUrl ?? "" }))}
        />
      )}
    </div>
  );
}
