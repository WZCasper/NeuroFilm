// Собирает каталог фильмов/сериалов, реально проверяя доступность на
// Kodik (title+kinopoisk_id=tmdbId — тот же паттерн, что уже используется
// в основном коде сайта). В catalog.json попадают ТОЛЬКО тайтлы, для
// которых Kodik реально вернул результат — никаких выдуманных строк.
const TMDB_KEY = process.env.TMDB_KEY;
const KODIK_TOKEN = process.env.KODIK_TOKEN;
const TMDB = 'https://api.themoviedb.org/3';
const kodikCache = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdbFetch(path, params = {}) {
  const url = new URL(TMDB + path);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'ru-RU');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${path} -> HTTP ${res.status}`);
  return res.json();
}

async function checkKodik(tmdbId, mediaType, title) {
  const cacheKey = `${mediaType}-${tmdbId}`;
  if (kodikCache.has(cacheKey)) return kodikCache.get(cacheKey);
  const params = new URLSearchParams({ token: KODIK_TOKEN, title, kinopoisk_id: String(tmdbId), limit: '1' });
  let available = false;
  try {
    const res = await fetch(`https://kodikapi.com/search?${params}`);
    if (res.ok) {
      const data = await res.json();
      available = Array.isArray(data.results) && data.results.length > 0;
    } else {
      console.error(`Kodik HTTP ${res.status} для "${title}"`);
    }
  } catch (e) {
    console.error(`Kodik недоступен для "${title}":`, e.message);
  }
  kodikCache.set(cacheKey, available);
  await sleep(350);
  return available;
}

async function fetchList(path, pages) {
  const items = [];
  for (let page = 1; page <= pages; page++) {
    const data = await tmdbFetch(path, { page });
    items.push(...(data.results || []));
    await sleep(300);
  }
  return items;
}

async function withAvailability(items, mediaType) {
  const out = [];
  for (const item of items) {
    const title = item.title || item.name || '';
    if (!title) continue;
    const available = await checkKodik(item.id, mediaType, title);
    if (available) {
      out.push({
        tmdbId: item.id,
        mediaType,
        title,
        posterPath: item.poster_path,
        year: (item.release_date || item.first_air_date || '').slice(0, 4),
        rating: item.vote_average ?? null,
      });
    }
  }
  return out;
}

async function main() {
  if (!TMDB_KEY || !KODIK_TOKEN) throw new Error('Не заданы TMDB_KEY / KODIK_TOKEN в переменных окружения');

  console.log('Собираю списки из TMDB...');
  const [popularMovies, topRatedMovies, nowPlayingMovies, upcomingMovies, popularTV, topRatedTV, onAirTV] =
    await Promise.all([
      fetchList('/movie/popular', 3),
      fetchList('/movie/top_rated', 2),
      fetchList('/movie/now_playing', 2),
      fetchList('/movie/upcoming', 2),
      fetchList('/tv/popular', 3),
      fetchList('/tv/top_rated', 2),
      fetchList('/tv/on_the_air', 2),
    ]);

  console.log(`Собрано из TMDB: ${popularMovies.length + topRatedMovies.length + nowPlayingMovies.length + upcomingMovies.length} фильмов, ${popularTV.length + topRatedTV.length + onAirTV.length} сериалов. Проверяю доступность на Kodik (это самая долгая часть)...`);

  const catalog = {
    generatedAt: new Date().toISOString(),
    movies: {
      popular: await withAvailability(popularMovies, 'movie'),
      topRated: await withAvailability(topRatedMovies, 'movie'),
      nowPlaying: await withAvailability(nowPlayingMovies, 'movie'),
      upcoming: await withAvailability(upcomingMovies, 'movie'),
    },
    tv: {
      popular: await withAvailability(popularTV, 'tv'),
      topRated: await withAvailability(topRatedTV, 'tv'),
      onAir: await withAvailability(onAirTV, 'tv'),
    },
  };

  const total =
    Object.values(catalog.movies).reduce((n, arr) => n + arr.length, 0) +
    Object.values(catalog.tv).reduce((n, arr) => n + arr.length, 0);

  const fs = require('fs');
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/catalog.json', JSON.stringify(catalog, null, 2));
  console.log(`Готово: ${total} тайтлов с подтверждённой доступностью на Kodik записано в data/catalog.json`);

  if (total === 0) {
    console.error('ВНИМАНИЕ: 0 тайтлов найдено — вероятно, KODIK_TOKEN недействителен или Kodik недоступен.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Скрипт упал с ошибкой:', err);
  process.exit(1);
});
