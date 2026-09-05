"use client";

import { useHostname } from "@/hooks/useHostname";
import { ChatEmbedLoading } from "@/components/room/ChatEmbedLoading";

export function TwitchChatEmbed({ channel }: { channel: string }) {
  const hostname = useHostname();

  if (!hostname) {
    return <ChatEmbedLoading label="Twitch" />;
  }

  // parent обязателен и должен ТОЧНО совпадать с доменом, на котором
  // открыт сайт — иначе Twitch покажет "не удалось загрузить чат".
  // На Vercel preview-доменах и localhost сработает автоматически,
  // т.к. hostname читается динамически, а не захардкожен.
  const src = `https://www.twitch.tv/embed/${encodeURIComponent(channel)}/chat?parent=${hostname}&darkpopout`;

  return (
    <iframe key={channel} src={src} title={`Twitch-чат ${channel}`} className="h-full w-full border-0" />
  );
}
