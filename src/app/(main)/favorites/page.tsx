"use client";

import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { MoviePosterGrid } from "@/components/movie/MoviePosterGrid";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const { favorites, loading } = useFavorites();

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-neutral-300">Войдите, чтобы видеть избранное</p>
        <TelegramLoginButton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">Избранное</h1>
      {loading ? (
        <p className="text-neutral-500">Загрузка…</p>
      ) : favorites.length === 0 ? (
        <p className="text-neutral-500">Пока пусто — добавляйте фильмы кнопкой «В избранное» на странице фильма.</p>
      ) : (
        <MoviePosterGrid items={favorites} />
      )}
    </div>
  );
}
