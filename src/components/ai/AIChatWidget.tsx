"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export function AIChatWidget() {
  const { user, profile, getIdToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [remainingFree, setRemainingFree] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Производное значение, а не отдельный синхронизируемый стейт: если
  // сервер выставил aiUnlimited, блокировка снимается сама на рендере,
  // без лишнего useEffect.
  const isBlocked = limitReached && !profile?.aiUnlimited;

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading || isBlocked || !user) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsLoading(true);

    try {
      const idToken = await getIdToken();
      if (!idToken) {
        setMessages((prev) => [...prev, { role: "model", text: "Сессия истекла, войдите заново." }]);
        return;
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await response.json();

      if (response.status === 402) {
        setLimitReached(true);
        setMessages((prev) => [...prev, { role: "model", text: data.message }]);
        return;
      }

      if (!response.ok) {
        setMessages((prev) => [...prev, { role: "model", text: "Произошла ошибка. Попробуйте позже." }]);
        return;
      }

      setRemainingFree(data.remainingFree ?? null);
      setMessages((prev) => [...prev, { role: "model", text: data.reply }]);
    } catch (err) {
      console.error("Ошибка запроса к ИИ-ассистенту:", err);
      setMessages((prev) => [...prev, { role: "model", text: "Не удалось связаться с сервером." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
      <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-4 py-3">
        <Sparkles className="h-5 w-5 text-nf-yellow" />
        <h3 className="font-semibold text-white">ИИ-ассистент NeuroFilm</h3>
        {remainingFree !== null && (
          <span className="ml-auto text-xs text-neutral-400">Осталось бесплатных сегодня: {remainingFree}</span>
        )}
        {profile?.aiUnlimited && <span className="ml-auto text-xs text-nf-yellow">Безлимит</span>}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">
            Спросите, что посмотреть — например: «Хочу нуарный триллер на вечер».
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-nf-yellow text-black" : "bg-neutral-800 text-neutral-100"
            }`}
          >
            {m.text}
          </div>
        ))}
        {isLoading && <div className="text-sm text-neutral-500">Печатает…</div>}
      </div>

      <div className="border-t border-neutral-800 bg-neutral-900 p-3">
        {!user ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <p className="text-xs text-neutral-500">Войдите через Telegram, чтобы пользоваться ассистентом</p>
            <TelegramLoginButton />
          </div>
        ) : isBlocked ? (
          <button
            type="button"
            onClick={() => {
              /* TODO: подключить оплату (Stripe в РФ не работает — нужен YooKassa/CloudPayments/Telegram Payments)
                 и переход на страницу подписки. Сама блокировка и текст уже полностью рабочие. */
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-nf-yellow py-2.5 font-semibold text-black transition-colors hover:bg-nf-yellow-bright"
          >
            <Lock className="h-4 w-4" />
            Оформить подписку
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Напишите сообщение…"
              className="flex-1 rounded-xl bg-neutral-800 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-nf-yellow"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="shrink-0 rounded-xl bg-nf-yellow p-2.5 text-black transition-colors hover:bg-nf-yellow-bright disabled:opacity-50"
              aria-label="Отправить"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
