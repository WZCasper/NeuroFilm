import "server-only";

const TMDB_BASE = "https://api.themoviedb.org/3";

function tmdbHeaders(): HeadersInit {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) {
    throw new Error("TMDB_API_READ_ACCESS_TOKEN не настроен на сервере");
  }
  return { Authorization: `Bearer ${token}`, accept: "application/json" };
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  runtime: number | null;
  genres: { id: number; name: string }[];
}

export async function fetchMovieDetails(tmdbId: number): Promise<TmdbMovieDetails | null> {
  const response = await fetch(`${TMDB_BASE}/movie/${tmdbId}?language=ru-RU`, {
    headers: tmdbHeaders(),
    next: { revalidate: 3600 },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchExternalIds(tmdbId: number): Promise<{ imdbId: string | null }> {
  const response = await fetch(`${TMDB_BASE}/movie/${tmdbId}/external_ids`, {
    headers: tmdbHeaders(),
    next: { revalidate: 86400 },
  });
  if (!response.ok) return { imdbId: null };
  const data = (await response.json()) as { imdb_id?: string | null };
  return { imdbId: data.imdb_id ?? null };
}

interface TmdbVideo {
  site: string;
  type: string;
  key: string;
}

/** Пробуем русский трейлер, при отсутствии — английский (как в прежней версии сайта). */
export async function fetchTrailerKey(tmdbId: number): Promise<string | null> {
  async function videosFor(lang: string): Promise<TmdbVideo[]> {
    const response = await fetch(`${TMDB_BASE}/movie/${tmdbId}/videos?language=${lang}`, {
      headers: tmdbHeaders(),
      next: { revalidate: 86400 },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { results?: TmdbVideo[] };
    return data.results ?? [];
  }

  let videos = await videosFor("ru-RU");
  if (!videos.some((v) => v.site === "YouTube")) {
    videos = await videosFor("en-US");
  }

  const trailer = videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ?? videos.find((v) => v.site === "YouTube");
  return trailer?.key ?? null;
}

export function tmdbPosterUrl(path: string | null, size: "w342" | "w500" = "w500"): string {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

export function tmdbBackdropUrl(path: string | null): string {
  return path ? `https://image.tmdb.org/t/p/original${path}` : "";
}
