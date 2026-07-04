"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Play, Pause, MessageSquare, ListVideo } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoomSync } from "@/hooks/useRoomSync";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { RoomChat } from "@/components/room/RoomChat";
import { ParticipantsList } from "@/components/room/ParticipantsList";
import { VoiceChatPanel } from "@/components/room/VoiceChatPanel";
import { PlaylistPanel } from "@/components/room/PlaylistPanel";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { PLAYER_SOURCES } from "@/lib/player-sources";

type SidebarTab = "chat" | "queue";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { room, participants, loading, isHost, updatePlayback, setActiveSource } = useRoomSync(roomId);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chat");

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
              onClick={() => updatePlayback({ isPlaying: !room.playback.isPlaying })}
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

      <aside className="flex h-[70vh] flex-col border-t border-neutral-800 lg:h-[calc(100vh-57px)] lg:border-l lg:border-t-0">
        <ParticipantsList participants={participants} hostId={room.hostId} />
        <VoiceChatPanel roomId={roomId} />

        <div className="flex border-b border-neutral-800">
          <SidebarTabButton
            active={sidebarTab === "chat"}
            onClick={() => setSidebarTab("chat")}
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="Чат"
          />
          <SidebarTabButton
            active={sidebarTab === "queue"}
            onClick={() => setSidebarTab("queue")}
            icon={<ListVideo className="h-3.5 w-3.5" />}
            label="Очередь"
          />
        </div>

        {sidebarTab === "chat" ? (
          <RoomChat roomId={roomId} />
        ) : (
          <PlaylistPanel roomId={roomId} hostId={room.hostId} isHost={isHost} />
        )}
      </aside>
    </div>
  );
}

function SidebarTabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
        active ? "border-b-2 border-nf-yellow text-nf-yellow" : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return <div className="flex min-h-[70vh] items-center justify-center text-neutral-400">{text}</div>;
}
