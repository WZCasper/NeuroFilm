import type { PlayerTabSource, MediaRef, ResolvedSource } from "@/types/player";

/**
 * Источники для вкладок плеера ("Плеер 1"–"Плеер 4").
 *
 * Kodik — единственный источник с реально портированной поддержкой
 * сериалов (сезоны/серии), потому что в старом сайте только у него эта
 * логика существовала (проверено по коду, а не предположено). Для
 * VideoCDN/Bazon/HDVB старый сайт использовал тот же movie-style запрос
 * что и для фильмов, без season/episode параметров — честно переношу
 * так же, без выдумывания того, чего не было.
 */

async function resolveKodik(media: MediaRef): Promise<ResolvedSource | null> {
  const params = new URLSearchParams({ title: media.title, mediaType: media.mediaType });
  if (media.imdbId) {
    params.set("imdbId", media.imdbId);
  } else {
    params.set("tmdbId", String(media.tmdbId));
  }

  const response = await fetch(`/api/kodik/search?${params.toString()}`);
  if (!response.ok) return null;

  const data = (await response.json()) as {
    dubs?: { id: number; title: string; url: string; episodes?: Record<number, Record<number, string>> }[];
  };
  const dubs = data.dubs ?? [];
  if (!dubs.length) return null;

  // Если со страницы сериала запрошены конкретные сезон/серия — стартуем
  // сразу с них (если Kodik их реально нашёл), иначе с первой доступной
  function initialUrlFor(dub: (typeof dubs)[number]): string {
    if (media.mediaType === "tv" && media.season != null && media.episode != null) {
      const requested = dub.episodes?.[media.season]?.[media.episode];
      if (requested) return requested;
    }
    return firstEpisodeUrl(dub) ?? dub.url;
  }

  return { url: initialUrlFor(dubs[0]), dubs };
}

function firstEpisodeUrl(dub: { url: string; episodes?: Record<number, Record<number, string>> }): string | null {
  if (!dub.episodes) return null;
  const seasons = Object.keys(dub.episodes).map(Number).sort((a, b) => a - b);
  if (seasons.length === 0) return null;
  const firstSeason = seasons[0];
  const episodeNums = Object.keys(dub.episodes[firstSeason]).map(Number).sort((a, b) => a - b);
  return dub.episodes[firstSeason]?.[episodeNums[0]] ?? null;
}

function resolveVideoCdn(media: MediaRef): ResolvedSource {
  const token = process.env.NEXT_PUBLIC_VIDEOCDN_TOKEN ?? "";
  const idParam = media.imdbId ? `imdb_id=${media.imdbId}` : `kinopoisk_id=${media.tmdbId}`;
  return { url: `https://videocdn.tv/api?token=${token}&${idParam}&show_page=1` };
}

function resolveBazon(media: MediaRef): ResolvedSource {
  const token = process.env.NEXT_PUBLIC_BAZON_TOKEN ?? "";
  const idParam = media.imdbId ? `imdb_id=${media.imdbId}` : `tmdbid=${media.tmdbId}`;
  return { url: `https://bazon.cc/api?token=${token}&${idParam}` };
}

function resolveHdvb(media: MediaRef): ResolvedSource {
  const token = process.env.NEXT_PUBLIC_HDVB_TOKEN ?? "";
  const id = media.imdbId || String(media.tmdbId);
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
    resolveUrl: async (media) => resolveVideoCdn(media),
  },
  {
    id: "bazon",
    label: "Плеер 3",
    supportsSync: false,
    resolveUrl: async (media) => resolveBazon(media),
  },
  {
    id: "hdvb",
    label: "Плеер 4",
    supportsSync: false,
    resolveUrl: async (media) => resolveHdvb(media),
  },
];
