import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminMessaging } from "@/lib/firebase/admin";

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

/**
 * Единственный триггер push-уведомлений в этой версии: хост начал
 * воспроизведение в комнате — участники, у которых вкладка не в фокусе,
 * узнают об этом не открывая её заново. Другие возможные триггеры
 * (кто-то присоединился, новая серия и т.п.) сознательно не добавлены —
 * в исходном ТЗ они не были описаны, а придумывать условия уведомлений
 * без запроса — плохая идея: то, что раздражает пользователей чаще
 * всего, это как раз выдуманные, никем не просимые пуши.
 */
export async function POST(request: NextRequest) {
  const uid = await getUidFromRequest(request);
  if (!uid) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: { roomId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  if (!body.roomId) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const roomRef = adminDb.collection("rooms").doc(body.roomId);
  const roomSnap = await roomRef.get();
  if (!roomSnap.exists) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const room = roomSnap.data()!;

  // Только хост может триггерить уведомление в своей комнате — иначе
  // любой участник мог бы засыпать остальных чужими пушами
  if (room.hostId !== uid) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const participantsSnap = await roomRef.collection("participants").get();
  const participantUids = participantsSnap.docs.map((d) => d.id).filter((id) => id !== uid);

  if (participantUids.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const userRefs = participantUids.map((id) => adminDb.collection("users").doc(id));
  const userDocs = await adminDb.getAll(...userRefs);

  const tokens: string[] = [];
  for (const userDoc of userDocs) {
    const data = userDoc.data();
    const fcmTokens = data?.fcmTokens as string[] | undefined;
    if (fcmTokens?.length) tokens.push(...fcmTokens);
  }

  if (tokens.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const response = await adminMessaging.sendEachForMulticast({
    tokens,
    notification: {
      title: "NeuroFilm",
      body: `«${room.movie?.title ?? "Фильм"}» — хост начал просмотр`,
    },
    webpush: {
      fcmOptions: { link: `/room/${body.roomId}` },
    },
  });

  return NextResponse.json({ sent: response.successCount });
}
