"use client";

import { useHostname } from "@/hooks/useHostname";
import { ChatEmbedLoading } from "@/components/room/ChatEmbedLoading";

export function YoutubeChatEmbed({ videoId }: { videoId: string }) {
  const hostname = useHostname();

  if (!hostname) {
    return <ChatEmbedLoading label="YouTube" />;
  }

  // embed_domain обязателен, как и parent у Twitch. Важное отличие от
  // Twitch: live_chat встраивается только для видео с АКТИВНОЙ (или
  // недавно завершённой, с включённым чатом) Live-трансляцией — для
  // обычного, не-Live видео YouTube покажет пустой чат/ошибку.
  const src = `https://www.youtube.com/live_chat?v=${encodeURIComponent(videoId)}&embed_domain=${hostname}&dark_theme=1`;

  return (
    <iframe key={videoId} src={src} title={`YouTube-чат ${videoId}`} className="h-full w-full border-0" />
  );
}
