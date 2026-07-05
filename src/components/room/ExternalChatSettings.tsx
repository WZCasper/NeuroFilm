"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Save } from "lucide-react";
import type { RoomDoc } from "@/types/room";

export function ExternalChatSettings({
  roomId,
  externalChat,
}: {
  roomId: string;
  externalChat: RoomDoc["externalChat"];
}) {
  const [twitchChannel, setTwitchChannel] = useState(externalChat?.twitchChannel ?? "");
  const [youtubeVideoId, setYoutubeVideoId] = useState(externalChat?.youtubeVideoId ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      // Firestore не принимает undefined в полях — пустое значение
      // явно записываем как null, а не просто пропускаем ключ
      await updateDoc(doc(db, "rooms", roomId), {
        externalChat: {
          twitchChannel: twitchChannel.trim() || null,
          youtubeVideoId: youtubeVideoId.trim() || null,
        },
      });
    } catch (err) {
      console.error("Не удалось сохранить настройки чата:", err);
      alert("Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2 border-b border-neutral-800 bg-neutral-950 px-3 py-3">
      <label className="block text-xs text-neutral-500">
        Twitch-канал (без twitch.tv/)
        <input
          value={twitchChannel}
          onChange={(e) => setTwitchChannel(e.target.value)}
          placeholder="например, my_channel"
          className="mt-1 w-full rounded-lg bg-neutral-900 px-2 py-1.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-nf-yellow"
        />
      </label>
      <label className="block text-xs text-neutral-500">
        ID трансляции YouTube (нужна активная Live-трансляция)
        <input
          value={youtubeVideoId}
          onChange={(e) => setYoutubeVideoId(e.target.value)}
          placeholder="например, dQw4w9WgXcQ"
          className="mt-1 w-full rounded-lg bg-neutral-900 px-2 py-1.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-nf-yellow"
        />
      </label>
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center gap-1.5 rounded-lg bg-nf-yellow px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-nf-yellow-bright disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" />
        Сохранить
      </button>
    </div>
  );
}
