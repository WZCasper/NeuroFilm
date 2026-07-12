"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import type { MediaType } from "@/types/media";

export interface FavoriteEntry {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterUrl: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [rawFavorites, setRawFavorites] = useState<FavoriteEntry[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "favorites"), orderBy("addedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setRawFavorites(snap.docs.map((d) => d.data() as FavoriteEntry));
      setIsSubscribed(true);
    });

    return () => {
      unsubscribe();
      setRawFavorites([]);
      setIsSubscribed(false);
    };
  }, [user]);

  const favorites = user ? rawFavorites : [];
  const loading = Boolean(user) && !isSubscribed;

  function isFavorite(mediaType: MediaType, tmdbId: number): boolean {
    return favorites.some((f) => f.mediaType === mediaType && f.tmdbId === tmdbId);
  }

  return { favorites, loading, isFavorite };
}
