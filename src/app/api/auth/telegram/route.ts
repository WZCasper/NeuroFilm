import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

interface TelegramAuthPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/** Максимальный возраст данных авторизации Telegram (защита от replay-атак). */
const AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;

/**
 * Проверка подписи по алгоритму Telegram Login Widget:
 * https://core.telegram.org/widgets/login#checking-authorization
 *
 * 1. data-check-string — все поля (кроме hash), отсортированные по ключу,
 *    в формате "key=value", объединённые через \n.
 * 2. secret_key = SHA256(bot_token).
 * 3. hash должен совпадать с HMAC-SHA256(data-check-string, secret_key).
 */
function isValidTelegramAuth(payload: TelegramAuthPayload, botToken: string): boolean {
  const { hash, ...rest } = payload;

  const dataCheckString = Object.entries(rest)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return false;

  const ageSeconds = Date.now() / 1000 - payload.auth_date;
  return ageSeconds >= 0 && ageSeconds < AUTH_MAX_AGE_SECONDS;
}

export async function POST(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN не настроен на сервере" }, { status: 500 });
  }

  let payload: TelegramAuthPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  if (!payload?.id || !payload?.hash || !payload?.auth_date) {
    return NextResponse.json({ error: "Некорректные данные авторизации Telegram" }, { status: 400 });
  }

  if (!isValidTelegramAuth(payload, botToken)) {
    return NextResponse.json({ error: "Подпись Telegram не прошла проверку" }, { status: 401 });
  }

  const uid = String(payload.id);
  const userRef = adminDb.collection("users").doc(uid);
  const existing = await userRef.get();

  const profileFields = {
    telegramId: payload.id,
    username: payload.username ?? null,
    firstName: payload.first_name,
    lastName: payload.last_name ?? null,
    photoUrl: payload.photo_url ?? null,
  };

  if (existing.exists) {
    await userRef.set(profileFields, { merge: true });
  } else {
    await userRef.set({
      ...profileFields,
      aiUnlimited: false,
      aiCredits: 0,
      aiUsage: { date: "", count: 0 },
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const customToken = await adminAuth.createCustomToken(uid);

  return NextResponse.json({ customToken });
}
