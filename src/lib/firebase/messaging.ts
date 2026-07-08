"use client";

import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { firebaseApp } from "@/lib/firebase/client";

let messagingInstance: Messaging | null = null;

/**
 * Messaging нельзя просто вызвать getMessaging() на верхнем уровне модуля:
 * это падает при SSR (нет window) и в браузерах без поддержки push
 * (например, iOS Safari до 16.4 в обычном режиме). isSupported()
 * асинхронно проверяет реальную доступность перед инициализацией.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  if (!supported) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging(firebaseApp);
  }
  return messagingInstance;
}
