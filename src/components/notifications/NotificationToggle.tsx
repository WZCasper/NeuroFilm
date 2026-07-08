"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { getToken } from "firebase/messaging";
import { doc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getMessagingInstance } from "@/lib/firebase/messaging";
import { useAuth } from "@/hooks/useAuth";

type PermissionState = NotificationPermission | "unsupported";

// Тот же безопасный паттерн чтения браузерного API, что и в useHostname:
// getServerSnapshot используется на сервере и при первом клиентском
// рендере до гидратации — расхождений с серверным HTML не возникает.
function subscribe() {
  return () => {};
}
function getSnapshot(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}
function getServerSnapshot(): PermissionState {
  return "unsupported";
}

export function NotificationToggle() {
  const { user } = useAuth();
  const initialPermission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Обновляется только внутри enable() (обработчик клика, не эффект) —
  // после того как пользователь реально ответил на системный запрос
  const [sessionPermission, setSessionPermission] = useState<NotificationPermission | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);

  const permission = sessionPermission ?? initialPermission;

  const enable = useCallback(async () => {
    if (!user) return;
    setIsEnabling(true);

    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const result = await Notification.requestPermission();
      setSessionPermission(result);
      if (result !== "granted") return;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error("NEXT_PUBLIC_FIREBASE_VAPID_KEY не настроен");
        return;
      }

      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (token) {
        await setDoc(doc(db, "users", user.uid), { fcmTokens: arrayUnion(token) }, { merge: true });
      }
    } catch (err) {
      console.error("Не удалось включить уведомления:", err);
    } finally {
      setIsEnabling(false);
    }
  }, [user]);

  if (permission === "unsupported" || !user) return null;

  if (permission === "granted") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-neutral-500">
        <Bell className="h-3.5 w-3.5 text-nf-yellow" />
        <span className="hidden sm:inline">Уведомления включены</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={isEnabling}
      className="flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-nf-yellow disabled:opacity-50"
      title="Включить push-уведомления"
    >
      {isEnabling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">Уведомления</span>
    </button>
  );
}
