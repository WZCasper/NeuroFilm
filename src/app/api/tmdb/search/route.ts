import { NextRequest, NextResponse } from "next/server";

interface TmdbMovieRaw {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
}

interface TmdbSearchResponse {
  results: TmdbMovieRaw[];
}

/**
 * Поиск фильмов TMDB для очереди комнаты. Токен (Bearer, v4 read access
 * token) остаётся на сервере — тот же принцип, что и для Gemini-ключа:
 * секреты не уходят в клиентский бандл.
 */
export async function GET(request: NextRequest) {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TMDB_API_READ_ACCESS_TOKEN не настроен на сервере" }, { status: 500 });
  }

  const query = request.nextUrl.searchParams.get("query")?.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const tmdbUrl = new URL("https://api.themoviedb.org/3/search/movie");
  tmdbUrl.searchParams.set("query", query);
  tmdbUrl.searchParams.set("language", "ru-RU");
  tmdbUrl.searchParams.set("include_adult", "false");

  let response: Response;
  try {
    response = await fetch(tmdbUrl, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
      // Одинаковые поисковые запросы (например, популярные названия)
      // не обязательно бить в TMDB заново каждую секунду
      next: { revalidate: 3600 },
    });
  } catch (err) {
    console.error("Сеть недоступна при обращении к TMDB:", err);
    return NextResponse.json({ error: "TMDB временно недоступен" }, { status: 502 });
  }

  if (!response.ok) {
    console.error("TMDB API вернул ошибку:", response.status, await response.text());
    return NextResponse.json({ error: "Не удалось выполнить поиск в TMDB" }, { status: 502 });
  }

  const data = (await response.json()) as TmdbSearchResponse;

  const results = data.results.slice(0, 8).map((movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : undefined,
    posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null,
  }));

  return NextResponse.json({ results });
}
