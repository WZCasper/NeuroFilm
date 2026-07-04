"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, onSnapshot, updateDoc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RoomDoc, RoomPlaybackState } from "@/types/room";

const PRESENCE_HEARTBEAT_MS = 10_000;

interface ParticipantView {
  username: string;
  photoUrl: string | null;
  lastSeen: number;
}

/**
 * Живая синхронизация комнаты через onSnapshot (задержка обычно
 * десятки–сотни мс — с запасом достаточно для play/pause/seek).
 * Firestore-правила разрешают писать в playback/activeSourceId
 * только хосту — со стороны клиента это дублируется проверкой isHost,
 * чтобы UI не давал зрителю нажать недоступную кнопку, но реальная
 * защита — именно в firestore.rules.
 */
export function useRoomSync(roomId: string) {
  const { user, profile } = useAuth();
  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [participants, setParticipants] = useState<Record<string, ParticipantView>>({});
  const [loading, setLoading] = useState(true);

  const isHost = Boolean(user && room && user.uid === room.hostId);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      setRoom(snap.exists() ? (snap.data() as RoomDoc) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "rooms", roomId, "participants"), (snap) => {
      const next: Record<string, ParticipantView> = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        next[docSnap.id] = {
          username: data.username,
          photoUrl: data.photoUrl ?? null,
          lastSeen: data.lastSeen?.toMillis?.() ?? Date.now(),
        };
      });
      setParticipants(next);
    });
    return unsubscribe;
  }, [roomId]);

  // Присутствие: только у авторизованных пользователей с профилем
  // (анонимная OBS-сессия — см. app/obs-room — не имеет profile и в
  // список зрителей не попадает, что и требуется для трансляции).
  useEffect(() => {
    if (!user || !profile) return;

    const participantRef = doc(db, "rooms", roomId, "participants", user.uid);
    const announce = () =>
      setDoc(
        participantRef,
        {
          username: profile.username ?? profile.firstName,
          photoUrl: profile.photoUrl,
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      ).catch((err) => console.error("Не удалось обновить присутствие в комнате:", err));

    announce();
    const interval = setInterval(announce, PRESENCE_HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [roomId, user, profile]);

  const updatePlayback = useCallback(
    async (partial: Partial<Pick<RoomPlaybackState, "isPlaying" | "positionSeconds">>) => {
      if (!user || !room) return;
      await updateDoc(doc(db, "rooms", roomId), {
        playback: {
          isPlaying: partial.isPlaying ?? room.playback.isPlaying,
          positionSeconds: partial.positionSeconds ?? room.playback.positionSeconds,
          updatedAt: Date.now(),
          updatedBy: user.uid,
        } satisfies RoomPlaybackState,
      });
    },
    [roomId, room, user]
  );

  const setActiveSource = useCallback(
    async (sourceId: string) => {
      await updateDoc(doc(db, "rooms", roomId), { activeSourceId: sourceId });
    },
    [roomId]
  );

  return { room, participants, loading, isHost, updatePlayback, setActiveSource };
}
