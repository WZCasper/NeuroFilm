import { NextResponse } from "next/server";

/**
 * firebase-messaging-sw.js должен быть настоящим JS-файлом по этому
 * конкретному пути (соглашение Firebase SDK), но обычный статический
 * файл в /public не может прочитать NEXT_PUBLIC_FIREBASE_* — Next.js
 * подставляет такие переменные только в файлы, проходящие через сборку,
 * а не в то, что раздаётся как есть. Поэтому это Route Handler: конфиг
 * Firebase подставляется на сервере при каждом запросе.
 *
 * Версия compat-скриптов синхронизирована с версией пакета firebase
 * в package.json (12.15.0) — а не угадана по памяти.
 */
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const body = `
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification && payload.notification.title ? payload.notification.title : "NeuroFilm";
  self.registration.showNotification(title, {
    body: payload.notification ? payload.notification.body : undefined,
    icon: "/icon-192.png",
  });
});
`.trim();

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache",
    },
  });
}
