"use client";

import { useEffect, useState, useRef } from "react";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/useAuth";
import { SendHorizontal } from "lucide-react";

interface ChatMessageDoc {
  uid: string;
  username: string;
  text: string;
}

export function RoomChat({ roomId }: { roomId: string }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<(ChatMessageDoc & { id: string })[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChatMessageDoc) })).reverse();
      setMessages(list);
    });
    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || !user || !profile) return;
    setText("");
    await addDoc(collection(db, "rooms", roomId, "messages"), {
      uid: user.uid,
      username: profile.username ?? profile.firstName,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {messages.length === 0 && <p className="text-xs text-neutral-500">Пока тихо. Напишите первым!</p>}
        {messages.map((m) => (
          <div key={m.id} className="text-sm leading-snug">
            <span className="font-medium text-nf-yellow">{m.username}: </span>
            <span className="text-neutral-200">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-neutral-800 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={user ? "Сообщение в чат комнаты…" : "Войдите, чтобы писать в чат"}
          disabled={!user}
          className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-nf-yellow disabled:opacity-50"
        />
        <button
          type="button"
          onClick={send}
          disabled={!user || !text.trim()}
          className="shrink-0 rounded-lg bg-nf-yellow px-3 py-2 text-black transition-opacity disabled:opacity-40"
          aria-label="Отправить"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
