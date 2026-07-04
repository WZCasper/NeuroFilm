"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import type { PlaylistItemDoc } from "@/types/playlist";
import type { RoomPlaybackState } from "@/types/room";

export interface PlaylistItemView extends PlaylistItemDoc {
  id: string;
}

interface SuggestedMovie {
  tmdbId: number;
  title: string;
  year?: number;
  posterUrl: string | null;
}

export function usePlaylist(roomId: string) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<PlaylistItemView[]>([]);

  useEffect(() => {
    // orderBy(createdAt) — стабильный порядок без композитных индексов;
    // сортировку по голосам делаем на клиенте (Firestore не умеет
    // сортировать по длине массива).
    const q = query(collection(db, "rooms", roomId, "playlist"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as PlaylistItemDoc) }));
      list.sort((a, b) => b.votes.length - a.votes.length);
      setItems(list);
    });
    return unsubscribe;
  }, [roomId]);

  const addToQueue = useCallback(
    async (movie: SuggestedMovie) => {
      if (!user || !profile) return;
      await addDoc(collection(db, "rooms", roomId, "playlist"), {
        ...movie,
        suggestedBy: user.uid,
        suggestedByName: profile.username ?? profile.firstName,
        votes: [],
        createdAt: serverTimestamp(),
      });
    },
    [roomId, user, profile]
  );

  const toggleVote = useCallback(
    async (item: PlaylistItemView) => {
      if (!user) return;
      const itemRef = doc(db, "rooms", roomId, "playlist", item.id);
      const hasVoted = item.votes.includes(user.uid);
      await updateDoc(itemRef, { votes: hasVoted ? arrayRemove(user.uid) : arrayUnion(user.uid) });
    },
    [roomId, user]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      await deleteDoc(doc(db, "rooms", roomId, "playlist", itemId));
    },
    [roomId]
  );

  const playNext = useCallback(
    async (item: PlaylistItemView, hostUid: string) => {
      await updateDoc(doc(db, "rooms", roomId), {
        movie: { tmdbId: item.tmdbId, title: item.title, posterUrl: item.posterUrl ?? "" },
        activeSourceId: null,
        playback: {
          isPlaying: false,
          positionSeconds: 0,
          updatedAt: Date.now(),
          updatedBy: hostUid,
        } satisfies RoomPlaybackState,
      });
      await deleteDoc(doc(db, "rooms", roomId, "playlist", item.id));
    },
    [roomId]
  );

  return { items, addToQueue, toggleVote, removeItem, playNext };
}
