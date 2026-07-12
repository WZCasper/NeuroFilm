"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRoomSync } from "@/hooks/useRoomSync";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { RemoteAudio } from "@/components/room/VoiceChatPanel";
import { PLAYER_SOURCES } from "@/lib/player-sources";
import "./obs.css";

/**
 * Роут для OBS Browser Source: /obs-room/[roomId]
 *
 * Жёсткие правила и то, как они выполнены здесь буквально (а не только
 * визуально через CSS):
 *
 *  1. Текстовые подписи — компонент ниже не рендерит ни одного label
 *     поверх видео; вкладки плеера скрыты через obs.css (управление
 *     остаётся у хоста на обычной странице /room/[roomId]).
 *  2. Рамки растут внутрь — border-box + box-shadow: inset в obs.css,
 *     внешние габариты Browser Source в OBS не меняются.
 *  3. Системные уведомления — этот файл ничего не импортирует из
 *     app/(main), поэтому Toaster/PWA install prompt/
 *     Notification.requestPermission() физически недостижимы с этого
 *     роута: их компоненты здесь просто отсутствуют в дереве React.
 *
 * OBS-браузер не проходит Telegram-логин, поэтому используется
 * анонимная авторизация Firebase — она нужна только чтобы пройти
 * правило isSignedIn() в firestore.rules и читать состояние комнаты.
 * Анонимная сессия не создаёт запись в users/ и не попадает в список
 * зрителей (см. комментарий в hooks/useRoomSync.ts).
 *
 * Голосовой чат подключается в режиме receiveOnly: без getUserMedia,
 * значит без единого permission-попапа — только тихо слушает и
 * проигрывает удалённые потоки через скрытые <audio>, чтобы OBS
 * захватил этот звук в трансляцию. Другие участники видят явный
 * индикатор "идёт в эфир" (см. VoiceChatPanel) — прозрачность вместо
 * тихой записи без ведома собеседников.
 *
 * Требования: включить Anonymous в Firebase Console → Authentication →
 * Sign-in method. Если звук не идёт в OBS — в свойствах Browser Source
 * проверь чекбокс "Control audio via OBS".
 */
export default function ObsRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => console.error("Анонимный вход для OBS не удался:", err));
    }
  }, []);

  const { room, loading } = useRoomSync(roomId);
  const { isJoined, remotePeers, join } = useVoiceChat(roomId, { receiveOnly: true });

  useEffect(() => {
    if (!loading && room && !isJoined) {
      join();
    }
  }, [loading, room, isJoined, join]);

  if (loading || !room) {
    return <div className="obs-root obs-empty" />;
  }

  return (
    <div className="obs-root">
      <div className="obs-player-frame">
        <VideoPlayer
          media={{ mediaType: "movie", ...room.movie }}
          posterUrl={room.movie.posterUrl}
          trailerYoutubeKey={null}
          sources={PLAYER_SOURCES}
          controlledTabId={room.activeSourceId}
          readOnly
        />
      </div>
      {Object.values(remotePeers).map((peer) => (
        <RemoteAudio key={peer.uid} stream={peer.stream} />
      ))}
    </div>
  );
}
