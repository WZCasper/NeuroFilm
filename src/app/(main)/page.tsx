import { AIChatWidget } from "@/components/ai/AIChatWidget";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <section className="mb-10">
        <h1 className="mb-2 text-3xl font-extrabold">
          NEURO<span className="text-nf-yellow">FILM</span>
        </h1>
        <p className="max-w-2xl text-neutral-400">
          Это техническая основа новой Next.js-версии: авторизация через Telegram, комнаты
          совместного просмотра с плеером на 4 источника и ИИ-ассистент с лимитом запросов.
          Каталог фильмов, hero-баннер, избранное и история просмотров из текущей версии сайта
          сюда ещё не перенесены — это отдельный следующий шаг.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800 bg-nf-surface p-5">
          <h2 className="mb-2 font-semibold text-nf-yellow">Комната просмотра</h2>
          <p className="text-sm text-neutral-400">
            Комнаты создаются с карточки фильма (см. компонент <code>CreateRoomButton</code>)
            и открываются по адресу <code>/room/[roomId]</code>.
          </p>
        </div>

        <div className="h-[480px]">
          <AIChatWidget />
        </div>
      </section>
    </div>
  );
}
