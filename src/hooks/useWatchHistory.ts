"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";

export interface HistoryEntry {
  tmdbId: number;
  title: string;
  posterUrl: string;
}

const HISTORY_LIMIT = 50;

export function useWatchHistory() {
  const { user } = useAuth();
  const [rawHistory, setRawHistory] = useState<HistoryEntry[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "history"),
      orderBy("watchedAt", "desc"),
      limit(HISTORY_LIMIT)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setRawHistory(snap.docs.map((d) => d.data() as HistoryEntry));
      setIsSubscribed(true);
    });

    return () => {
      unsubscribe();
      setRawHistory([]);
      setIsSubscribed(false);
    };
  }, [user]);

  const history = user ? rawHistory : [];
  const loading = Boolean(user) && !isSubscribed;

  return { history, loading };
}
