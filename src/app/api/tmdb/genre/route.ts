import { NextRequest, NextResponse } from "next/server";

interface TmdbMovieRaw {
  id: number;
  title: string;
  poster_path?: string | null;
}

interface TmdbDiscoverResponse {
  results: TmdbMovieRaw[];
}

export async function GET(request: NextRequest) {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TMDB_API_READ_ACCESS_TOKEN не настроен на сервере" }, { status: 500 });
  }

  const genreId = request.nextUrl.searchParams.get("id");
  if (!genreId) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://api.themoviedb.org/3/discover/movie");
  url.searchParams.set("with_genres", genreId);
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("language", "ru-RU");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
      next: { revalidate: 3600 },
    });
  } catch (err) {
    console.error("Сеть недоступна при обращении к TMDB:", err);
    return NextResponse.json({ error: "TMDB временно недоступен" }, { status: 502 });
  }

  if (!response.ok) {
    console.error("TMDB API вернул ошибку:", response.status, await response.text());
    return NextResponse.json({ error: "Не удалось загрузить жанр" }, { status: 502 });
  }

  const data = (await response.json()) as TmdbDiscoverResponse;
  const results = data.results.map((movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : "",
  }));

  return NextResponse.json({ results });
}
