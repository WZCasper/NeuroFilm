import type { PlayerTabSource, MovieRef } from "@/types/player";

/**
 * Источники для вкладок плеера ("Плеер 1"–"Плеер 4").
 *
 * Как это используется: VideoPlayer.tsx строит вкладки из этого массива.
 * При выборе вкладки вызывается resolveUrl(movie), и результат попадает
 * в единственный существующий iframe — остальные вкладки в этот момент
 * ничего не рендерят (см. components/player/VideoPlayer.tsx).
 *
 * Почему resolveUrl ниже — заглушки, а не готовые ссылки на Kodik/
 * VideoCDN/Bazon/HDVB: у каждого из этих CIS-балансеров закрытый формат
 * ссылки и токен, привязанный конкретно к твоему аккаунту. Придумать
 * правдоподобно выглядящий URL несложно, но он не будет работать —
 * а отличить рабочую ссылку от красиво угаданной на глаз нельзя, пока
 * не попробуешь в бою. Это ровно тот случай "имитации", которого ты
 * просил избегать, поэтому здесь — честная точка расширения.
 *
 * Пришли свою текущую рабочую функцию построения ссылки для Kodik
 * (ты уже разбирался с его postMessage API для переключения озвучки
 * и skip-intro) — и я подставлю её сюда без каких-либо угадываний.
 */
export const PLAYER_SOURCES: PlayerTabSource[] = [
  {
    id: "kodik",
    label: "Плеер 1",
    supportsSync: true, // у Kodik есть документированный postMessage API
    resolveUrl: notImplemented("kodik"),
  },
  {
    id: "videocdn",
    label: "Плеер 2",
    supportsSync: false,
    resolveUrl: notImplemented("videocdn"),
  },
  {
    id: "bazon",
    label: "Плеер 3",
    supportsSync: false,
    resolveUrl: notImplemented("bazon"),
  },
  {
    id: "hdvb",
    label: "Плеер 4",
    supportsSync: false,
    resolveUrl: notImplemented("hdvb"),
  },
];

function notImplemented(balancer: string): (movie: MovieRef) => Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- сигнатура задана типом PlayerTabSource["resolveUrl"]
  return async (movie: MovieRef): Promise<string | null> => {
    console.warn(
      `[player-sources] Источник "${balancer}" ещё не подключён. ` +
        `Замени эту функцию на реальный resolveUrl для ${balancer}.`
    );
    return null;
  };
}
