import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Инициализация Firebase Admin SDK. Работает ТОЛЬКО на сервере
 * (API Routes / Server Components) — пакет "server-only" не даст
 * случайно затащить это в клиентский бандл вместе с приватным ключом.
 *
 * Требует сервис-аккаунт из Firebase Console → Project settings →
 * Service accounts → Generate new private key. НЕ требует включённого
 * биллинга (Blaze) — Admin SDK работает с любым планом Firebase,
 * биллинг Firebase нужен только для Cloud Functions/Cloud Run,
 * которые в этом проекте не используются: вся серверная логика
 * выполняется в Next.js API Routes на Vercel.
 */
function createAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // В Vercel переменные окружения хранят перенос строки как "\n" (два символа),
  // поэтому его нужно явно превратить обратно в настоящий перевод строки.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin: не заданы переменные окружения FIREBASE_ADMIN_PROJECT_ID / " +
        "FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const adminApp = createAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
