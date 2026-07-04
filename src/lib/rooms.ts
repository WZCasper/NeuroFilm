"use client";

import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { RoomMovieRef } from "@/types/room";

/**
 * Создаёт новую комнату совместного просмотра и возвращает её id
 * (он же — код для подключения других пользователей: /room/{id}).
 */
export async function createRoom(hostId: string, movie: RoomMovieRef): Promise<string> {
  const roomRef = doc(collection(db, "rooms"));

  await setDoc(roomRef, {
    hostId,
    movie,
    activeSourceId: null,
    playback: {
      isPlaying: false,
      positionSeconds: 0,
      updatedAt: Date.now(),
      updatedBy: hostId,
    },
    createdAt: serverTimestamp(),
  });

  return roomRef.id;
}
