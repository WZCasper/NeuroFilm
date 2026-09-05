"use client";

import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { addFavorite, removeFavorite, type MediaLibraryRef } from "@/lib/library";

export function FavoriteButton({ media }: { media: MediaLibraryRef }) {
  const { user } = useAuth();
  const { isFavorite } = useFavorites();
  const active = isFavorite(media.mediaType, media.tmdbId);

  async function handleClick() {
    if (!user) return;
    if (active) {
      await removeFavorite(user.uid, media);
    } else {
      await addFavorite(user.uid, media);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!user}
      title={user ? undefined : "Войдите, чтобы добавлять в избранное"}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-nf-yellow bg-nf-yellow text-black"
          : "border-neutral-700 text-neutral-300 hover:border-nf-yellow hover:text-nf-yellow"
      }`}
    >
      <Heart className="h-4 w-4" fill={active ? "black" : "none"} />
      {active ? "В избранном" : "В избранное"}
    </button>
  );
}
