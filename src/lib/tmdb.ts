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
export async function fetchTrailerKey(tmdbId: number, mediaType: "movie" | "tv" = "movie"): Promise<string | null> {
  async function videosFor(lang: string): Promise<TmdbVideo[]> {
    const response = await fetch(`${TMDB_BASE}/${mediaType}/${tmdbId}/videos?language=${lang}`, {
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

async function tmdbGet<T>(path: string, params: Record<string, string> = {}, revalidate = 3600): Promise<T | null> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("language", "ru-RU");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { headers: tmdbHeaders(), next: { revalidate } });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export interface TmdbMovieSummary {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}

export async function fetchPopularMovies(): Promise<TmdbMovieSummary[]> {
  const data = await tmdbGet<{ results: TmdbMovieSummary[] }>("/movie/popular");
  return data?.results ?? [];
}

export async function fetchTopRatedMovies(): Promise<TmdbMovieSummary[]> {
  const data = await tmdbGet<{ results: TmdbMovieSummary[] }>("/movie/top_rated");
  return data?.results ?? [];
}

export async function fetchUpcomingMovies(): Promise<TmdbMovieSummary[]> {
  const data = await tmdbGet<{ results: TmdbMovieSummary[] }>("/movie/upcoming");
  return data?.results ?? [];
}

export async function fetchNowPlayingMovies(): Promise<TmdbMovieSummary[]> {
  const data = await tmdbGet<{ results: TmdbMovieSummary[] }>("/movie/now_playing");
  return data?.results ?? [];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export async function fetchGenres(): Promise<TmdbGenre[]> {
  const data = await tmdbGet<{ genres: TmdbGenre[] }>("/genre/movie/list", {}, 86400);
  return data?.genres ?? [];
}

// === Сериалы ===

export interface TmdbTVDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  genres: { id: number; name: string }[];
}

export async function fetchTVDetails(tmdbId: number): Promise<TmdbTVDetails | null> {
  const response = await fetch(`${TMDB_BASE}/tv/${tmdbId}?language=ru-RU`, {
    headers: tmdbHeaders(),
    next: { revalidate: 3600 },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchTVExternalIds(tmdbId: number): Promise<{ imdbId: string | null }> {
  const response = await fetch(`${TMDB_BASE}/tv/${tmdbId}/external_ids`, {
    headers: tmdbHeaders(),
    next: { revalidate: 86400 },
  });
  if (!response.ok) return { imdbId: null };
  const data = (await response.json()) as { imdb_id?: string | null };
  return { imdbId: data.imdb_id ?? null };
}

export interface TmdbSeasonEpisode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
}

export async function fetchTVSeasonEpisodes(tmdbId: number, season: number): Promise<TmdbSeasonEpisode[]> {
  const response = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/${season}?language=ru-RU`, {
    headers: tmdbHeaders(),
    next: { revalidate: 3600 },
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { episodes?: TmdbSeasonEpisode[] };
  return data.episodes ?? [];
}

export async function fetchTVGenres(): Promise<TmdbGenre[]> {
  const data = await tmdbGet<{ genres: TmdbGenre[] }>("/genre/tv/list", {}, 86400);
  return data?.genres ?? [];
}

// === Общий поиск (фильмы + сериалы) ===

export interface TmdbMultiSearchItem {
  media_type: "movie" | "tv" | "person";
  id: number;
  title?: string; // фильм
  name?: string; // сериал/персона
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
}

export async function fetchMultiSearch(query: string): Promise<TmdbMultiSearchItem[]> {
  const data = await tmdbGet<{ results: TmdbMultiSearchItem[] }>("/search/multi", { query });
  return (data?.results ?? []).filter((item) => item.media_type === "movie" || item.media_type === "tv");
}
