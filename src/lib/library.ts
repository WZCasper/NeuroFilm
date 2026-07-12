"use client";

import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { mediaKey, type MediaType } from "@/types/media";

export interface MediaLibraryRef {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterUrl: string;
}

export async function addFavorite(uid: string, media: MediaLibraryRef): Promise<void> {
  await setDoc(doc(db, "users", uid, "favorites", mediaKey(media)), {
    ...media,
    addedAt: serverTimestamp(),
  });
}

export async function removeFavorite(uid: string, media: Pick<MediaLibraryRef, "mediaType" | "tmdbId">): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "favorites", mediaKey(media)));
}

/** setDoc с merge — повторный просмотр того же тайтла просто обновляет watchedAt, а не плодит дубли. */
export async function logHistoryView(uid: string, media: MediaLibraryRef): Promise<void> {
  await setDoc(
    doc(db, "users", uid, "history", mediaKey(media)),
    { ...media, watchedAt: serverTimestamp() },
    { merge: true }
  );
}
