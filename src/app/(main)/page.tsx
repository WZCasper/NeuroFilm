import { HomeContent } from "@/components/home/HomeContent";
import {
  fetchPopularMovies,
  fetchTopRatedMovies,
  fetchUpcomingMovies,
  fetchNowPlayingMovies,
  fetchGenres,
  tmdbPosterUrl,
  tmdbBackdropUrl,
  type TmdbMovieSummary,
} from "@/lib/tmdb";

function toRowItems(movies: TmdbMovieSummary[]) {
  return movies.map((m) => ({ tmdbId: m.id, title: m.title, posterUrl: tmdbPosterUrl(m.poster_path) }));
}

export default async function HomePage() {
  const [popular, topRated, upcoming, nowPlaying, genres] = await Promise.all([
    fetchPopularMovies(),
    fetchTopRatedMovies(),
    fetchUpcomingMovies(),
    fetchNowPlayingMovies(),
    fetchGenres(),
  ]);

  const genreNameById = new Map(genres.map((g) => [g.id, g.name]));

  const heroMovies = popular
    .filter((m) => m.backdrop_path)
    .slice(0, 5)
    .map((m) => ({
      tmdbId: m.id,
      title: m.title,
      overview: m.overview,
      backdropUrl: tmdbBackdropUrl(m.backdrop_path),
      posterUrl: tmdbPosterUrl(m.poster_path),
      year: m.release_date ? Number(m.release_date.slice(0, 4)) : undefined,
      rating: m.vote_average,
      genres: m.genre_ids.map((id) => genreNameById.get(id)).filter((name): name is string => Boolean(name)),
    }));

  return (
    <HomeContent
      heroMovies={heroMovies}
      genres={genres}
      popular={toRowItems(popular)}
      topRated={toRowItems(topRated)}
      upcoming={toRowItems(upcoming)}
      nowPlaying={toRowItems(nowPlaying)}
    />
  );
}
