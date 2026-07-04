"use client";

import { useEffect, useState } from "react";

/**
 * Возвращает текущее время (мс) и обновляет его раз в intervalMs.
 *
 * Зачем это нужно: вызывать Date.now() прямо в теле рендера — impure-
 * операция (React 19 / React Compiler требуют чистоты рендера). Без
 * этого хука индикатор "в сети / не в сети" в ParticipantsList обновлялся
 * бы ТОЛЬКО когда меняется сам объект participants (то есть только по
 * чужому heartbeat), и человек, который тихо закрыл вкладку, ещё долго
 * выглядел бы "онлайн". useNow даёт компоненту собственный тик.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
