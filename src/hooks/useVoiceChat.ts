"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  setDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { getIceServers } from "@/lib/webrtc/config";
import type { VoicePeerDoc, VoiceSignalDoc } from "@/types/voice";

export interface RemoteVoicePeer {
  uid: string;
  username: string;
  muted: boolean;
  isBroadcast: boolean;
  stream: MediaStream | null;
}

interface UseVoiceChatOptions {
  /**
   * Режим "только слушать": не запрашивает микрофон (нет permission-
   * попапа) и не добавляет свой трек в соединения. Используется на
   * роуте /obs-room, где никто не должен видеть системные диалоги.
   */
  receiveOnly?: boolean;
}

/**
 * Полносвязная (mesh) архитектура — каждый пир соединяется с каждым
 * напрямую. Это осознанный выбор для комнат просмотра: не требует
 * выделенного медиа-сервера (SFU), значит остаётся бесплатным и
 * serverless. Практический предел — 4-6 одновременных говорящих
 * (дальше растут исходящий трафик и нагрузка на CPU каждого клиента);
 * для больших комнат следующим шагом стал бы SFU вроде LiveKit Cloud
 * (у него есть бесплатный тариф), но это отдельная инфраструктура.
 */
export function useVoiceChat(roomId: string, options: UseVoiceChatOptions = {}) {
  const { receiveOnly = false } = options;
  const { user, profile } = useAuth();

  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remotePeers, setRemotePeers] = useState<Record<string, RemoteVoicePeer>>({});
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const connectionsRef = useRef<Record<string, RTCPeerConnection>>({});

  const sendSignal = useCallback(
    async (to: string, payload: Omit<VoiceSignalDoc, "from" | "to">) => {
      if (!user) return;
      await addDoc(collection(db, "rooms", roomId, "voiceSignals"), {
        from: user.uid,
        to,
        ...payload,
      });
    },
    [roomId, user]
  );

  const closePeerConnection = useCallback((remoteUid: string) => {
    const pc = connectionsRef.current[remoteUid];
    if (pc) {
      pc.close();
      delete connectionsRef.current[remoteUid];
    }
  }, []);

  const createPeerConnection = useCallback(
    (remoteUid: string, iAmInitiator: boolean): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      connectionsRef.current[remoteUid] = pc;

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(remoteUid, { kind: "ice-candidate", candidate: event.candidate.toJSON() });
        }
      };

      pc.ontrack = (event) => {
        setRemotePeers((prev) => {
          const existing = prev[remoteUid];
          if (!existing) return prev;
          return { ...prev, [remoteUid]: { ...existing, stream: event.streams[0] } };
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          closePeerConnection(remoteUid);
        }
      };

      if (iAmInitiator) {
        pc.createOffer()
          .then(async (offer) => {
            await pc.setLocalDescription(offer);
            await sendSignal(remoteUid, { kind: "offer", sdp: { type: offer.type, sdp: offer.sdp } });
          })
          .catch((err: unknown) => console.error("Ошибка создания offer:", err));
      }

      return pc;
    },
    [sendSignal, closePeerConnection]
  );

  const handleIncomingSignal = useCallback(
    async (signal: VoiceSignalDoc) => {
      const remoteUid = signal.from;
      let pc = connectionsRef.current[remoteUid];

      if (signal.kind === "offer" && signal.sdp) {
        if (!pc) pc = createPeerConnection(remoteUid, false);
        await pc.setRemoteDescription(signal.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(remoteUid, { kind: "answer", sdp: { type: answer.type, sdp: answer.sdp } });
        return;
      }

      if (!pc) return; // answer/ice для уже закрытого соединения — игнорируем

      if (signal.kind === "answer" && signal.sdp) {
        await pc.setRemoteDescription(signal.sdp);
        return;
      }

      if (signal.kind === "ice-candidate" && signal.candidate) {
        await pc.addIceCandidate(signal.candidate).catch((err: unknown) => console.error("Ошибка ICE:", err));
      }
    },
    [createPeerConnection, sendSignal]
  );

  // Подписки на пиров и сигналы — только пока пользователь в голосовом чате
  useEffect(() => {
    if (!isJoined || !user) return;

    const peersUnsub = onSnapshot(collection(db, "rooms", roomId, "voicePeers"), (snap) => {
      const currentUids = new Set<string>();
      const docsByUid: Record<string, VoicePeerDoc> = {};

      snap.forEach((docSnap) => {
        const uid = docSnap.id;
        if (uid === user.uid) return;
        currentUids.add(uid);
        docsByUid[uid] = docSnap.data() as VoicePeerDoc;

        if (!connectionsRef.current[uid]) {
          // Детерминированный выбор инициатора оффера по сравнению uid —
          // чтобы обе стороны не создавали offer одновременно ("glare").
          createPeerConnection(uid, user.uid > uid);
        }
      });

      Object.keys(connectionsRef.current).forEach((uid) => {
        if (!currentUids.has(uid)) closePeerConnection(uid);
      });

      setRemotePeers((prev) => {
        const next: Record<string, RemoteVoicePeer> = {};
        currentUids.forEach((uid) => {
          const data = docsByUid[uid];
          next[uid] = {
            uid,
            username: data.username,
            muted: data.muted,
            isBroadcast: data.isBroadcast ?? false,
            stream: prev[uid]?.stream ?? null,
          };
        });
        return next;
      });
    });

    const signalsQuery = query(collection(db, "rooms", roomId, "voiceSignals"), where("to", "==", user.uid));
    const signalsUnsub = onSnapshot(signalsQuery, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== "added") return;
        handleIncomingSignal(change.doc.data() as VoiceSignalDoc);
        deleteDoc(change.doc.ref).catch(() => {});
      });
    });

    return () => {
      peersUnsub();
      signalsUnsub();
    };
  }, [isJoined, roomId, user, createPeerConnection, closePeerConnection, handleIncomingSignal]);

  // Полная очистка при уходе со страницы, даже если "Покинуть" не нажали
  useEffect(() => {
    return () => {
      Object.values(connectionsRef.current).forEach((pc) => pc.close());
      connectionsRef.current = {};
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      if (user) {
        deleteDoc(doc(db, "rooms", roomId, "voicePeers", user.uid)).catch(() => {});
      }
    };
  }, [roomId, user]);

  const join = useCallback(async () => {
    if (!user || isJoined) return;
    setError(null);

    if (!receiveOnly) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Браузер не поддерживает голосовой чат (или сайт открыт не по HTTPS).");
        return;
      }
      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error("Не удалось получить доступ к микрофону:", err);
        setError("Не удалось получить доступ к микрофону. Проверьте разрешения браузера.");
        return;
      }
    }

    await setDoc(doc(db, "rooms", roomId, "voicePeers", user.uid), {
      username: receiveOnly ? "Трансляция (OBS)" : profile?.username ?? profile?.firstName ?? "Гость",
      muted: receiveOnly,
      isBroadcast: receiveOnly,
    } satisfies VoicePeerDoc);

    setIsJoined(true);
  }, [user, profile, roomId, isJoined, receiveOnly]);

  const leave = useCallback(async () => {
    if (!user) return;
    Object.keys(connectionsRef.current).forEach(closePeerConnection);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setRemotePeers({});
    setIsJoined(false);
    setIsMuted(false);
    await deleteDoc(doc(db, "rooms", roomId, "voicePeers", user.uid)).catch(() => {});
  }, [user, roomId, closePeerConnection]);

  const toggleMute = useCallback(async () => {
    if (!localStreamRef.current || !user) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
    await setDoc(doc(db, "rooms", roomId, "voicePeers", user.uid), { muted: nextMuted }, { merge: true }).catch(
      () => {}
    );
  }, [isMuted, user, roomId]);

  return { isJoined, isMuted, remotePeers, error, join, leave, toggleMute };
}
