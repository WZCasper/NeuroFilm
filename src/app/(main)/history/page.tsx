"use client";

import { useAuth } from "@/hooks/useAuth";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { MoviePosterGrid } from "@/components/movie/MoviePosterGrid";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { history, loading } = useWatchHistory();

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-neutral-300">Войдите, чтобы видеть историю просмотров</p>
        <TelegramLoginButton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold">История просмотров</h1>
      {loading ? (
        <p className="text-neutral-500">Загрузка…</p>
      ) : history.length === 0 ? (
        <p className="text-neutral-500">Пока пусто — история появится, когда вы откроете страницу фильма.</p>
      ) : (
        <MoviePosterGrid items={history} />
      )}
    </div>
  );
}
