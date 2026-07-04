import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const FREE_REQUESTS_PER_DAY = 2;
// Проверено поиском на актуальность (не deprecated) — при желании
// поменять модель достаточно изменить эту константу.
const GEMINI_MODEL = "gemini-2.5-flash";

interface ChatRequestBody {
  message: string;
  history?: { role: "user" | "model"; text: string }[];
}

/** Дата в таймзоне Europe/Moscow в формате YYYY-MM-DD — граница "суток" для лимита. */
function getMoscowDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function getUidFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice("Bearer ".length));
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const uid = await getUidFromRequest(request);
  if (!uid) {
    return NextResponse.json({ error: "AUTH_REQUIRED", message: "Требуется авторизация" }, { status: 401 });
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Некорректное тело запроса" }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Пустое сообщение" }, { status: 400 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  const today = getMoscowDateString(new Date());

  // Всё решение "пускать/не пускать" и списание лимита — в одной
  // Firestore-транзакции, чтобы двойной клик или два параллельных
  // запроса не дали пользователю больше бесплатных обращений, чем
  // положено. Проверка на клиенте — только для UX, не для защиты.
  let allowed = false;
  let remainingFree: number | null = null;

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      allowed = false;
      return;
    }
    const data = snap.data()!;

    if (data.aiUnlimited === true) {
      allowed = true;
      remainingFree = null; // null = безлимит, показываем в UI без счётчика
      return;
    }

    const usageToday = data.aiUsage?.date === today ? (data.aiUsage.count as number) : 0;

    if (usageToday < FREE_REQUESTS_PER_DAY) {
      allowed = true;
      remainingFree = FREE_REQUESTS_PER_DAY - usageToday - 1;
      tx.set(userRef, { aiUsage: { date: today, count: usageToday + 1 } }, { merge: true });
      return;
    }

    const credits = typeof data.aiCredits === "number" ? data.aiCredits : 0;
    if (credits > 0) {
      allowed = true;
      remainingFree = 0;
      tx.set(userRef, { aiCredits: FieldValue.increment(-1) }, { merge: true });
      return;
    }

    allowed = false;
  });

  if (!allowed) {
    return NextResponse.json(
      {
        error: "LIMIT_REACHED",
        message:
          "Лимит бесплатных запросов к ИИ-ассистенту исчерпан на сегодня (2 в сутки). " +
          "Оформите подписку или докупите запросы, чтобы продолжить общение с ассистентом.",
      },
      { status: 402 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SERVER_MISCONFIGURED", message: "GEMINI_API_KEY не настроен на сервере" },
      { status: 500 }
    );
  }

  const systemInstruction =
    "Ты — киноэксперт-ассистент сайта NeuroFilm. Помогай пользователю подбирать фильмы " +
    "и сериалы под настроение и вкус, отвечай кратко, дружелюбно и по-русски.";

  const contents = [
    ...(body.history ?? []).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: body.message }] },
  ];

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
        }),
      }
    );
  } catch (err) {
    console.error("Сеть недоступна при обращении к Gemini API:", err);
    return NextResponse.json({ error: "UPSTREAM_ERROR", message: "ИИ временно недоступен" }, { status: 502 });
  }

  if (!geminiResponse.ok) {
    console.error("Gemini API вернул ошибку:", geminiResponse.status, await geminiResponse.text());
    return NextResponse.json({ error: "UPSTREAM_ERROR", message: "Ошибка при обращении к ИИ" }, { status: 502 });
  }

  const geminiData = await geminiResponse.json();
  const reply: string =
    geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Извините, не удалось получить ответ.";

  return NextResponse.json({ reply, remainingFree });
}
