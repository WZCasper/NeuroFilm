/**
 * Элемент общей очереди: rooms/{roomId}/playlist/{itemId}
 * Голоса хранятся как массив uid проголосовавших — для масштаба одной
 * комнаты просмотра (не тысячи голосов) это простой и достаточный
 * паттерн: количество голосов — просто длина массива.
 */
export interface PlaylistItemDoc {
  tmdbId: number;
  title: string;
  year?: number;
  posterUrl: string | null;
  suggestedBy: string;
  suggestedByName: string;
  votes: string[];
}
