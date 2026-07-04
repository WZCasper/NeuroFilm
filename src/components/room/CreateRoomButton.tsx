"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createRoom } from "@/lib/rooms";
import type { RoomMovieRef } from "@/types/room";

export function CreateRoomButton({ movie }: { movie: RoomMovieRef }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleClick() {
    if (!user || isCreating) return;
    setIsCreating(true);
    try {
      const roomId = await createRoom(user.uid, movie);
      router.push(`/room/${roomId}`);
    } catch (err) {
      console.error("Не удалось создать комнату:", err);
      alert("Не удалось создать комнату. Попробуйте ещё раз.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!user || isCreating}
      className="inline-flex items-center gap-2 rounded-xl border border-nf-yellow px-4 py-2.5 text-sm font-medium text-nf-yellow transition-colors hover:bg-nf-yellow hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
      title={user ? undefined : "Войдите, чтобы создать комнату"}
    >
      {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
      Смотреть вместе
    </button>
  );
}
