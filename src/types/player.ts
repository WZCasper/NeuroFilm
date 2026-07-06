export interface MovieRef {
  tmdbId: number;
  title: string;
  year?: number;
  kinopoiskId?: string;
  imdbId?: string;
}

export interface PlayerDub {
  id: number | string;
  title: string;
  url: string;
}

export interface ResolvedSource {
  url: string;
  /** Альтернативные озвучки для переключения без смены вкладки (пока только у Kodik). */
  dubs?: PlayerDub[];
}

export interface PlayerTabSource {
  /** Стабильный id вкладки, используется как ключ и как activeSourceId в комнате */
  id: string;
  /** Подпись на вкладке, например "Плеер 1" */
  label: string;
  /**
   * Асинхронно возвращает готовый источник для iframe, либо null, если
   * для этого фильма источник недоступен. Асинхронность нужна не только
   * "на будущее" — у Kodik это реально так: сначала запрос к его API
   * (см. app/api/kodik/search), и только потом готовая embed-ссылка.
   */
  resolveUrl: (movie: MovieRef) => Promise<ResolvedSource | null>;
  /**
   * Умеет ли конкретно этот источник принимать команды play/pause/seek
   * программно (обычно через postMessage в iframe). Если false — комната
   * всё равно транслирует состояние хоста всем зрителям, но синхронизация
   * самого видео внутри iframe становится "мягкой" (зритель ориентируется
   * на статус, а не жёстко синхронизируется автоматически).
   */
  supportsSync: boolean;
}
