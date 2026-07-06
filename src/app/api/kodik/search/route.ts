import { NextRequest, NextResponse } from "next/server";

interface KodikTranslation {
  id: number;
  title: string;
  type: string;
}

interface KodikResult {
  translation?: KodikTranslation;
  link: string;
}

interface KodikSearchResponse {
  results?: KodikResult[];
}

/**
 * Прокси к kodikapi.com/search. Портировано из текущей рабочей версии
 * сайта (KODIK_TOKEN там был захардкожен прямо в клиентском JS — здесь
 * он остаётся на сервере, что чуть лучше, но сам факт токена и его
 * значение уже публичны в текущем index.html, так что это не смена
 * секрета, а просто более аккуратное расположение).
 */
export async function GET(request: NextRequest) {
  const token = process.env.KODIK_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "KODIK_TOKEN не настроен на сервере" }, { status: 500 });
  }

  const imdbId = request.nextUrl.searchParams.get("imdbId");
  const tmdbId = request.nextUrl.searchParams.get("tmdbId");
  const title = request.nextUrl.searchParams.get("title") ?? "";

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

  // Дедуплицируем по id озвучки — так же, как в прежней версии сайта:
  // Kodik возвращает по результату на каждую комбинацию озвучка+эпизод,
  // а нам для списка озвучек нужна только одна запись на каждую озвучку.
  const dubsById = new Map<number, { id: number; title: string; type: string; url: string }>();
  for (const result of results) {
    if (result.translation && !dubsById.has(result.translation.id)) {
      dubsById.set(result.translation.id, {
        id: result.translation.id,
        title: result.translation.title,
        type: result.translation.type,
        url: result.link.startsWith("http") ? result.link : `https:${result.link}`,
      });
    }
  }

  return NextResponse.json({ dubs: Array.from(dubsById.values()) });
}
