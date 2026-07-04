/**
 * Профиль пользователя в Firestore: users/{uid}
 * uid === telegramId в виде строки (см. app/api/auth/telegram/route.ts).
 */
export interface UserProfile {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;

  /** Безлимитный доступ к ИИ-ассистенту (включается вручную/по оплате). */
  aiUnlimited: boolean;
  /** Докупленные запросы сверх бесплатного лимита. */
  aiCredits: number;
  /** Счётчик бесплатных запросов за текущие сутки (Europe/Moscow). */
  aiUsage: {
    date: string; // "YYYY-MM-DD" по Москве
    count: number;
  };
}
