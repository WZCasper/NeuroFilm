"use client";

import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface MovieLibraryRef {
  tmdbId: number;
  title: string;
  posterUrl: string;
}

export async function addFavorite(uid: string, movie: MovieLibraryRef): Promise<void> {
  await setDoc(doc(db, "users", uid, "favorites", String(movie.tmdbId)), {
    ...movie,
    addedAt: serverTimestamp(),
  });
}

export async function removeFavorite(uid: string, tmdbId: number): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "favorites", String(tmdbId)));
}

/** setDoc с merge — повторный просмотр того же фильма просто обновляет watchedAt, а не плодит дубли. */
export async function logHistoryView(uid: string, movie: MovieLibraryRef): Promise<void> {
  await setDoc(
    doc(db, "users", uid, "history", String(movie.tmdbId)),
    { ...movie, watchedAt: serverTimestamp() },
    { merge: true }
  );
}
