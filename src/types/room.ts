/**
 * Комната совместного просмотра: rooms/{roomId}
 * Подколлекции: rooms/{roomId}/participants/{uid}, rooms/{roomId}/messages/{messageId}
 */
export interface RoomMovieRef {
  tmdbId: number;
  title: string;
  posterUrl: string;
  kinopoiskId?: string;
  imdbId?: string;
}

export interface RoomPlaybackState {
  isPlaying: boolean;
  positionSeconds: number;
  updatedAt: number; // Date.now() в момент команды
  updatedBy: string; // uid хоста
}

export interface RoomDoc {
  hostId: string;
  movie: RoomMovieRef;
  /** id активного источника плеера (см. types/player.ts), либо null пока не выбран */
  activeSourceId: string | null;
  playback: RoomPlaybackState;
  createdAt: number;
  /**
   * Настраивается хостом в самой комнате (см. ExternalChatSettings).
   * null/отсутствие поля — вкладка соответствующего чата просто не
   * показывается в сайдбаре.
   */
  externalChat?: {
    twitchChannel: string | null;
    youtubeVideoId: string | null;
  };
}

export interface RoomParticipant {
  username: string;
  photoUrl: string | null;
  /** миллисекунды, обновляется heartbeat-ом раз в 10 сек — используется для online/offline */
  lastSeen: number;
}

export interface RoomChatMessage {
  uid: string;
  username: string;
  text: string;
  createdAt: number;
}
