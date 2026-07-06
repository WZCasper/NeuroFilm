import type { PlayerTabSource, MovieRef, ResolvedSource } from "@/types/player";

/**
 * Источники для вкладок плеера ("Плеер 1"–"Плеер 4").
 *
 * Логика построения ссылок портирована 1:1 из текущей рабочей версии
 * сайта (index.html) — токены те же, что уже используются в проде.
 * Kodik устроен иначе, чем остальные три: это не шаблон строки, а
 * реальный вызов его API (см. app/api/kodik/search), который отдаёт
 * список доступных озвучек — поэтому у него единственного бывает
 * несколько вариантов (dubs) в ResolvedSource.
 */

async function resolveKodik(movie: MovieRef): Promise<ResolvedSource | null> {
  const params = new URLSearchParams({ title: movie.title });
  if (movie.imdbId) {
    params.set("imdbId", movie.imdbId);
  } else {
    params.set("tmdbId", String(movie.tmdbId));
  }

  const response = await fetch(`/api/kodik/search?${params.toString()}`);
  if (!response.ok) return null;

  const data = (await response.json()) as { dubs?: { id: number; title: string; url: string }[] };
  const dubs = data.dubs ?? [];
  if (!dubs.length) return null;

  return { url: dubs[0].url, dubs };
}

function resolveVideoCdn(movie: MovieRef): ResolvedSource {
  const token = process.env.NEXT_PUBLIC_VIDEOCDN_TOKEN ?? "";
  const idParam = movie.imdbId ? `imdb_id=${movie.imdbId}` : `kinopoisk_id=${movie.tmdbId}`;
  return { url: `https://videocdn.tv/api?token=${token}&${idParam}&show_page=1` };
}

function resolveBazon(movie: MovieRef): ResolvedSource {
  const token = process.env.NEXT_PUBLIC_BAZON_TOKEN ?? "";
  const idParam = movie.imdbId ? `imdb_id=${movie.imdbId}` : `tmdbid=${movie.tmdbId}`;
  return { url: `https://bazon.cc/api?token=${token}&${idParam}` };
}

function resolveHdvb(movie: MovieRef): ResolvedSource {
  const token = process.env.NEXT_PUBLIC_HDVB_TOKEN ?? "";
  const id = movie.imdbId || String(movie.tmdbId);
  return { url: `https://hdvb.ru/embed/movie/${id}?token=${token}` };
}

export const PLAYER_SOURCES: PlayerTabSource[] = [
  {
    id: "kodik",
    label: "Плеер 1",
    supportsSync: true, // у Kodik есть документированный postMessage API (skip-intro и т.п.)
    resolveUrl: resolveKodik,
  },
  {
    id: "videocdn",
    label: "Плеер 2",
    supportsSync: false,
    resolveUrl: async (movie) => resolveVideoCdn(movie),
  },
  {
    id: "bazon",
    label: "Плеер 3",
    supportsSync: false,
    resolveUrl: async (movie) => resolveBazon(movie),
  },
  {
    id: "hdvb",
    label: "Плеер 4",
    supportsSync: false,
    resolveUrl: async (movie) => resolveHdvb(movie),
  },
];
