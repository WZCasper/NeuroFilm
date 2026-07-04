"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Phone, Radio } from "lucide-react";
import { useVoiceChat, type RemoteVoicePeer } from "@/hooks/useVoiceChat";

export function VoiceChatPanel({ roomId }: { roomId: string }) {
  const { isJoined, isMuted, remotePeers, error, join, leave, toggleMute } = useVoiceChat(roomId);

  const peers = Object.values(remotePeers);
  const hasBroadcastListener = peers.some((p) => p.isBroadcast);

  return (
    <div className="border-b border-neutral-800 px-3 py-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Голосовой чат</p>
        {isJoined ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className={`rounded-full p-1.5 transition-colors ${
                isMuted ? "bg-neutral-700 text-neutral-300" : "bg-nf-yellow text-black"
              }`}
              aria-label={isMuted ? "Включить микрофон" : "Выключить микрофон"}
            >
              {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={leave}
              className="rounded-full bg-red-500/90 p-1.5 text-white transition-colors hover:bg-red-500"
              aria-label="Покинуть голосовой чат"
            >
              <PhoneOff className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={join}
            className="flex items-center gap-1.5 rounded-full bg-nf-yellow px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-nf-yellow-bright"
          >
            <Phone className="h-3.5 w-3.5" />
            Присоединиться
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {hasBroadcastListener && (
        <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
          <Radio className="h-3.5 w-3.5 shrink-0" />
          В комнате есть слушатель трансляции — голос участников идёт в эфир.
        </p>
      )}

      {isJoined && (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-1 text-xs text-nf-yellow">
            {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />} Вы
          </span>
          {peers.map((peer) => (
            <PeerBadge key={peer.uid} peer={peer} />
          ))}
        </div>
      )}

      {/* Скрытые аудио-элементы — воспроизводят удалённые потоки */}
      {peers.map((peer) => (
        <RemoteAudio key={peer.uid} stream={peer.stream} />
      ))}
    </div>
  );
}

function PeerBadge({ peer }: { peer: RemoteVoicePeer }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-1 text-xs text-neutral-200">
      {peer.isBroadcast ? (
        <Radio className="h-3 w-3 text-red-400" />
      ) : peer.muted ? (
        <MicOff className="h-3 w-3 text-neutral-500" />
      ) : (
        <Mic className="h-3 w-3 text-nf-yellow" />
      )}
      {peer.username}
    </span>
  );
}

export function RemoteAudio({ stream }: { stream: MediaStream | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}
