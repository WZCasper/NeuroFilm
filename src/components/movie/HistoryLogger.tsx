"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { logHistoryView, type MovieLibraryRef } from "@/lib/library";

/** Ничего не рендерит — только пишет запись в историю просмотров при первом монтировании. */
export function HistoryLogger({ movie }: { movie: MovieLibraryRef }) {
  const { user } = useAuth();
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!user || loggedRef.current) return;
    loggedRef.current = true;
    logHistoryView(user.uid, movie).catch((err: unknown) => console.error("Не удалось записать в историю:", err));
  }, [user, movie]);

  return null;
}
