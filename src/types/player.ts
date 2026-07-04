export interface MovieRef {
  tmdbId: number;
  title: string;
  year?: number;
  kinopoiskId?: string;
  imdbId?: string;
}

export interface PlayerTabSource {
  /** Стабильный id вкладки, используется как ключ и как activeSourceId в комнате */
  id: string;
  /** Подпись на вкладке, например "Плеер 1" */
  label: string;
  /**
   * Асинхронно возвращает готовую ссылку для iframe конкретного балансера,
   * либо null, если для этого фильма источник недоступен.
   * Асинхронность заложена намеренно: у части балансеров (например, Kodik)
   * реальная интеграция — это сначала поиск по kinopoisk_id/imdb_id через
   * их API, а уже потом embed-ссылка из ответа, а не чистый шаблон строки.
   */
  resolveUrl: (movie: MovieRef) => Promise<string | null>;
  /**
   * Умеет ли конкретно этот источник принимать команды play/pause/seek
   * программно (обычно через postMessage в iframe). Если false — комната
   * всё равно транслирует состояние хоста всем зрителям, но синхронизация
   * самого видео внутри iframe становится "мягкой" (зритель ориентируется
   * на статус, а не жёстко синхронизируется автоматически).
   */
  supportsSync: boolean;
}
