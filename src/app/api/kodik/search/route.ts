import { NextRequest, NextResponse } from "next/server";

interface KodikTranslation {
  id: number;
  title: string;
  type: string;
}

interface KodikResult {
  translation?: KodikTranslation;
  link: string;
  /** Только у сериалов: "1": { "1": "https://...", "2": "https://..." } */
  episodes?: Record<string, Record<string, string>>;
  season?: number;
}

interface KodikSearchResponse {
  results?: KodikResult[];
}

function normalizeLink(link: string): string {
  return link.startsWith("http") ? link : `https:${link}`;
}

/**
 * Прокси к kodikapi.com/search. Портировано из текущей рабочей версии
 * сайта (KODIK_TOKEN там был захардкожен прямо в клиентском JS — здесь
 * он остаётся на сервере, что чуть лучше, но сам факт токена и его
 * значение уже публичны в текущем index.html, так что это не смена
 * секрета, а просто более аккуратное расположение).
 *
 * Для сериалов (mediaType=tv) Kodik возвращает по результату на каждую
 * пару озвучка+сезон, с полем episodes = { серия: ссылка }. Собираем
 * это в единую карту сезон -> серия -> ссылка на озвучку — точно так
 * же, как строилось seasons-block/episodes-list в прежней версии сайта.
 */
export async function GET(request: NextRequest) {
  const token = process.env.KODIK_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "KODIK_TOKEN не настроен на сервере" }, { status: 500 });
  }

  const imdbId = request.nextUrl.searchParams.get("imdbId");
  const tmdbId = request.nextUrl.searchParams.get("tmdbId");
  const title = request.nextUrl.searchParams.get("title") ?? "";
  const mediaType = request.nextUrl.searchParams.get("mediaType") === "tv" ? "tv" : "movie";

  if (!imdbId && !tmdbId) {
    return NextResponse.json({ error: "Нужен imdbId или tmdbId" }, { status: 400 });
  }

  // У Kodik нет способа искать по настоящему Kinopoisk ID из данных TMDB
  // (TMDB не отдаёт кросс-референс на Kinopoisk). Как и в прежней версии
  // сайта, при отсутствии imdbId передаём tmdbId в параметр kinopoisk_id.
  // Точного совпадения ID это не даёт, но Kodik дополнительно матчит по
  // title, и на практике это находит нужный тайтл в большинстве случаев.
  const idParam = imdbId
    ? `imdb_id=${encodeURIComponent(imdbId)}`
    : `kinopoisk_id=${encodeURIComponent(tmdbId!)}`;

  const url =
    `https://kodikapi.com/search?token=${token}&${idParam}` +
    `&title=${encodeURIComponent(title)}&with_material_data=true&with_episodes=true`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error("Kodik API недоступен:", err);
    return NextResponse.json({ dubs: [] });
  }

  if (!response.ok) {
    console.error("Kodik API вернул ошибку:", response.status);
    return NextResponse.json({ dubs: [] });
  }

  const data = (await response.json()) as KodikSearchResponse;
  const results = data.results ?? [];

  interface DubAccumulator {
    id: number;
    title: string;
    type: string;
    url: string;
    episodes: Record<number, Record<number, string>>;
  }

  const dubsById = new Map<number, DubAccumulator>();

  for (const result of results) {
    if (!result.translation) continue;
    const dubId = result.translation.id;

    let dub = dubsById.get(dubId);
    if (!dub) {
      dub = {
        id: dubId,
        title: result.translation.title,
        type: result.translation.type,
        url: normalizeLink(result.link),
        episodes: {},
      };
      dubsById.set(dubId, dub);
    }

    if (mediaType === "tv" && result.episodes) {
      for (const [seasonStr, episodesMap] of Object.entries(result.episodes)) {
        const season = Number(seasonStr);
        if (!dub.episodes[season]) dub.episodes[season] = {};
        for (const [episodeStr, link] of Object.entries(episodesMap)) {
          dub.episodes[season][Number(episodeStr)] = normalizeLink(link);
        }
      }
    }
  }

  const dubs = Array.from(dubsById.values()).map((dub) => ({
    id: dub.id,
    title: dub.title,
    type: dub.type,
    url: dub.url,
    episodes: Object.keys(dub.episodes).length > 0 ? dub.episodes : undefined,
  }));

  return NextResponse.json({ dubs });
}
