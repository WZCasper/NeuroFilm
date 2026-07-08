"use client";

import { useParams } from "next/navigation";
import { Play, Pause } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoomSync } from "@/hooks/useRoomSync";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { RoomSidebar } from "@/components/room/RoomSidebar";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { PLAYER_SOURCES } from "@/lib/player-sources";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, getIdToken, loading: authLoading } = useAuth();
  const { room, participants, loading, isHost, updatePlayback, setActiveSource } = useRoomSync(roomId);

  async function handlePlayPause() {
    if (!room) return;
    const startingPlayback = !room.playback.isPlaying;
    await updatePlayback({ isPlaying: startingPlayback });

    // Пуш — только при старте просмотра, не при паузе: пауза не то
    // событие, ради которого стоит будить кому-то телефон
    if (startingPlayback) {
      const idToken = await getIdToken();
      if (idToken) {
        fetch("/api/rooms/notify-play", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ roomId }),
        }).catch((err: unknown) => console.error("Не удалось отправить push-уведомление:", err));
      }
    }
  }

  if (authLoading || loading) {
    return <CenteredMessage text="Загрузка комнаты…" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <p className="text-neutral-300">Войдите, чтобы присоединиться к комнате</p>
        <TelegramLoginButton />
      </div>
    );
  }

  if (!room) {
    return <CenteredMessage text="Комната не найдена — проверьте код или создайте новую." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
      <div className="p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-bold">{room.movie.title}</h1>
          <span className="shrink-0 rounded-full bg-neutral-900 px-3 py-1 font-mono text-xs text-nf-yellow">
            Код: {roomId}
          </span>
        </div>

        <VideoPlayer
          movie={room.movie}
          posterUrl={room.movie.posterUrl}
          trailerYoutubeKey={null}
          sources={PLAYER_SOURCES}
          controlledTabId={room.activeSourceId}
          onTabChange={isHost ? setActiveSource : undefined}
          readOnly={!isHost}
        />

        {isHost ? (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayPause}
              className="flex items-center gap-2 rounded-xl bg-nf-yellow px-5 py-2.5 font-semibold text-black transition-colors hover:bg-nf-yellow-bright"
            >
              {room.playback.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {room.playback.isPlaying ? "Пауза" : "Играть"}
            </button>
            <span className="text-xs text-neutral-500">
              Вы — хост. Состояние синхронизируется у всех зрителей.
            </span>
          </div>
        ) : (
          <p className="mt-4 text-xs text-neutral-500">
            Воспроизведением управляет хост ·{" "}
            {room.playback.isPlaying ? "сейчас идёт просмотр" : "на паузе"}
          </p>
        )}
      </div>

      <RoomSidebar roomId={roomId} room={room} participants={participants} isHost={isHost} />
    </div>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return <div className="flex min-h-[70vh] items-center justify-center text-neutral-400">{text}</div>;
}
