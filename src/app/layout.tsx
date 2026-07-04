import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroFilm — онлайн-кинотеатр",
  description: "Бесплатный онлайн-кинотеатр NeuroFilm: фильмы, сериалы, совместный просмотр и ИИ-подбор.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

/**
 * Корневой layout — НАМЕРЕННО минимальный. Здесь только AuthProvider
 * (нужен на всех роутах, включая /obs-room). Toaster, баннер установки
 * PWA и любые вызовы Notification.requestPermission() живут только в
 * app/(main)/layout.tsx — благодаря этому /obs-room физически не может
 * их отрендерить, а не просто скрывает через CSS.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-black text-white antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
