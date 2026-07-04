"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

/**
 * Официальный Telegram Login Widget (https://core.telegram.org/widgets/login).
 * Бот должен быть создан через @BotFather, а домен сайта — привязан
 * к боту командой /setdomain. Имя бота задаётся через
 * NEXT_PUBLIC_TELEGRAM_BOT_USERNAME.
 */
export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loginWithTelegram } = useAuth();

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      console.error("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME не задан в .env.local");
      return;
    }

    window.onTelegramAuth = (telegramUser) => {
      loginWithTelegram(telegramUser).catch((err) => {
        console.error("Ошибка входа через Telegram:", err);
        alert("Не удалось войти через Telegram. Попробуйте ещё раз.");
      });
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    const node = containerRef.current;
    node?.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
      if (node) node.innerHTML = "";
    };
  }, [loginWithTelegram]);

  return <div ref={containerRef} className="inline-flex" />;
}
