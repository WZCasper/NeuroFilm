"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { FavoriteButton } from "@/components/movie/FavoriteButton";

export interface HeroMovie {
  tmdbId: number;
  title: string;
  overview: string;
  backdropUrl: string;
  posterUrl: string;
  year?: number;
  rating: number;
  genres: string[];
}

const AUTO_ADVANCE_MS = 7000;

export function HeroBanner({ movies }: { movies: HeroMovie[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (movies.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % movies.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(interval);
  }, [movies.length]);

  if (movies.length === 0) return null;

  const movie = movies[activeIndex];

  return (
    <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden rounded-2xl">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={movie.tmdbId} src={movie.backdropUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/30 to-transparent" />
      </div>

      <div className="relative flex h-full max-w-xl flex-col justify-end gap-4 p-6 lg:p-10">
        <div className="flex flex-wrap gap-2">
          {movie.genres.slice(0, 3).map((genre) => (
            <span key={genre} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-neutral-200 backdrop-blur">
              {genre}
            </span>
          ))}
        </div>

        <h2 className="text-3xl font-extrabold leading-tight lg:text-4xl">{movie.title}</h2>

        <div className="flex items-center gap-3 text-sm text-neutral-300">
          {movie.year && <span>{movie.year}</span>}
          <span>★ {movie.rating.toFixed(1)}</span>
        </div>

        <p className="line-clamp-3 text-sm text-neutral-300">{movie.overview}</p>

        <div className="flex items-center gap-3 pt-2">
          <Link
            href={`/movie/${movie.tmdbId}`}
            className="flex items-center gap-2 rounded-xl bg-nf-yellow px-5 py-2.5 font-semibold text-black transition-colors hover:bg-nf-yellow-bright"
          >
            <Play className="h-4 w-4" fill="black" />
            Смотреть
          </Link>
          <FavoriteButton movie={{ tmdbId: movie.tmdbId, title: movie.title, posterUrl: movie.posterUrl }} />
        </div>
      </div>

      {movies.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-1.5 lg:bottom-6 lg:right-8">
          {movies.map((m, i) => (
            <button
              key={m.tmdbId}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Слайд ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? "w-6 bg-nf-yellow" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
