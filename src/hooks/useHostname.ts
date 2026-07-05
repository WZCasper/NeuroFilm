"use client";

import { useSyncExternalStore } from "react";

/**
 * window.location.hostname нужен для parent/embed_domain параметров
 * Twitch и YouTube чатов — оба сервиса отказывают во встройке, если
 * этот параметр не совпадает с реальным доменом страницы.
 *
 * useSyncExternalStore — специально предназначенный для этого API
 * React: getServerSnapshot используется на сервере и при самом первом
 * клиентском рендере ДО гидратации, поэтому расхождений между
 * серверным HTML и первым клиентским рендером не возникает (в отличие
 * от чтения window напрямую в теле компонента или сброса через
 * useEffect + setState).
 */
function subscribe() {
  return () => {};
}

function getSnapshot(): string {
  return window.location.hostname;
}

function getServerSnapshot(): string {
  return "";
}

export function useHostname(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
