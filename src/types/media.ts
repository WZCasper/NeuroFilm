export type MediaType = "movie" | "tv";

/**
 * У фильма и сериала в TMDB отдельные, не пересекающиеся пространства
 * ID — фильм с id=550 и сериал с id=550 это два разных объекта. Поэтому
 * mediaType — обязательное поле, а не опциональный довесок: любое место,
 * которое использует только tmdbId как ключ (Firestore-документы
 * избранного/истории/очереди), обязано учитывать и его тоже.
 */
export interface MediaRef {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  year?: number;
  imdbId?: string;
  kinopoiskId?: string;
  /** Только для mediaType: "tv" — какой сезон/эпизод выбран сейчас. */
  season?: number;
  episode?: number;
}

/** Составной ключ для документов Firestore — см. комментарий выше про пересечение ID. */
export function mediaKey(ref: Pick<MediaRef, "mediaType" | "tmdbId">): string {
  return `${ref.mediaType}-${ref.tmdbId}`;
}
