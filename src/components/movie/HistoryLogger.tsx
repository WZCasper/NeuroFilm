"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { logHistoryView, type MediaLibraryRef } from "@/lib/library";

/** Ничего не рендерит — только пишет запись в историю просмотров при первом монтировании. */
export function HistoryLogger({ media }: { media: MediaLibraryRef }) {
  const { user } = useAuth();
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!user || loggedRef.current) return;
    loggedRef.current = true;
    logHistoryView(user.uid, media).catch((err: unknown) => console.error("Не удалось записать в историю:", err));
  }, [user, media]);

  return null;
}
