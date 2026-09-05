"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { getMessagingInstance } from "@/lib/firebase/messaging";

/**
 * Работает только если разрешение уже было выдано раньше — сам запрос
 * разрешения происходит исключительно по явному клику в
 * NotificationToggle, не автоматически при заходе на сайт.
 */
export function NotificationListener() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    getMessagingInstance().then((messaging) => {
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        if (!payload.notification) return;
        new Notification(payload.notification.title ?? "NeuroFilm", {
          body: payload.notification.body,
          icon: "/icon-192.png",
        });
      });
    });

    return () => unsubscribe?.();
  }, []);

  return null;
}
