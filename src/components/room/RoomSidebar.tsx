"use client";

import { useState } from "react";
import { MessageSquare, Tv2, MonitorPlay, ListVideo, Settings } from "lucide-react";
import { ParticipantsList } from "@/components/room/ParticipantsList";
import { VoiceChatPanel } from "@/components/room/VoiceChatPanel";
import { RoomChat } from "@/components/room/RoomChat";
import { PlaylistPanel } from "@/components/room/PlaylistPanel";
import { TwitchChatEmbed } from "@/components/room/TwitchChatEmbed";
import { YoutubeChatEmbed } from "@/components/room/YoutubeChatEmbed";
import { ExternalChatSettings } from "@/components/room/ExternalChatSettings";
import type { RoomDoc } from "@/types/room";

type SidebarTab = "chat" | "twitch" | "youtube" | "queue";

interface ParticipantView {
  username: string;
  photoUrl: string | null;
  lastSeen: number;
}

export function RoomSidebar({
  roomId,
  room,
  participants,
  isHost,
}: {
  roomId: string;
  room: RoomDoc;
  participants: Record<string, ParticipantView>;
  isHost: boolean;
}) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chat");
  const [showChatSettings, setShowChatSettings] = useState(false);

  const hasTwitch = Boolean(room.externalChat?.twitchChannel);
  const hasYoutube = Boolean(room.externalChat?.youtubeVideoId);

  // Производное значение вместо сброса sidebarTab через эффект: если
  // хост убрал канал, а у зрителя была открыта вкладка "twitch" — она
  // просто перестаёт быть валидной прямо на этом рендере.
  const activeTab: SidebarTab =
    (sidebarTab === "twitch" && !hasTwitch) || (sidebarTab === "youtube" && !hasYoutube) ? "chat" : sidebarTab;

  return (
    <aside className="flex h-[70vh] flex-col border-t border-neutral-800 lg:h-[calc(100vh-57px)] lg:border-l lg:border-t-0">
      <ParticipantsList participants={participants} hostId={room.hostId} />
      <VoiceChatPanel roomId={roomId} />

      {isHost && (
        <div className="flex items-center justify-end border-b border-neutral-800 px-3 py-1.5">
          <button
            type="button"
            onClick={() => setShowChatSettings((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-nf-yellow"
          >
            <Settings className="h-3.5 w-3.5" />
            Внешние чаты
          </button>
        </div>
      )}

      {isHost && showChatSettings && (
        <ExternalChatSettings roomId={roomId} externalChat={room.externalChat} />
      )}

      <div className="flex border-b border-neutral-800">
        <SidebarTabButton
          active={activeTab === "chat"}
          onClick={() => setSidebarTab("chat")}
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          label="Чат"
        />
        {hasTwitch && (
          <SidebarTabButton
            active={activeTab === "twitch"}
            onClick={() => setSidebarTab("twitch")}
            icon={<Tv2 className="h-3.5 w-3.5" />}
            label="Twitch"
          />
        )}
        {hasYoutube && (
          <SidebarTabButton
            active={activeTab === "youtube"}
            onClick={() => setSidebarTab("youtube")}
            icon={<MonitorPlay className="h-3.5 w-3.5" />}
            label="YouTube"
          />
        )}
        <SidebarTabButton
          active={activeTab === "queue"}
          onClick={() => setSidebarTab("queue")}
          icon={<ListVideo className="h-3.5 w-3.5" />}
          label="Очередь"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === "chat" && <RoomChat roomId={roomId} />}
        {activeTab === "twitch" && room.externalChat?.twitchChannel && (
          <TwitchChatEmbed channel={room.externalChat.twitchChannel} />
        )}
        {activeTab === "youtube" && room.externalChat?.youtubeVideoId && (
          <YoutubeChatEmbed videoId={room.externalChat.youtubeVideoId} />
        )}
        {activeTab === "queue" && <PlaylistPanel roomId={roomId} hostId={room.hostId} isHost={isHost} />}
      </div>
    </aside>
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
        active
          ? "border-b-2 border-nf-yellow text-nf-yellow"
          : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
