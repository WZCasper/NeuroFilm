"use client";

import { useNow } from "@/hooks/useNow";

const ONLINE_THRESHOLD_MS = 20_000; // heartbeat раз в 10с — 20с даёт запас на один пропуск

interface ParticipantView {
  username: string;
  photoUrl: string | null;
  lastSeen: number;
}

export function ParticipantsList({
  participants,
  hostId,
}: {
  participants: Record<string, ParticipantView>;
  hostId: string;
}) {
  const now = useNow(5_000);
  const entries = Object.entries(participants).sort(([uidA], [uidB]) =>
    uidA === hostId ? -1 : uidB === hostId ? 1 : 0
  );

  return (
    <div className="border-b border-neutral-800 px-3 py-2">
      <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Зрители ({entries.length})</p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([uid, p]) => {
          const isOnline = now - p.lastSeen < ONLINE_THRESHOLD_MS;
          return (
            <div key={uid} className="flex items-center gap-1.5 rounded-full bg-neutral-900 py-1 pl-1 pr-2.5">
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-nf-yellow" : "bg-neutral-600"}`} />
              <span className="text-xs text-neutral-200">
                {p.username}
                {uid === hostId && " · хост"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
