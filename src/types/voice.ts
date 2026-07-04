/**
 * Присутствие в голосовом чате: rooms/{roomId}/voicePeers/{uid}
 * Каждый пишет только свой документ (см. firestore.rules).
 */
export interface VoicePeerDoc {
  username: string;
  muted: boolean;
  /**
   * true — это не человек, а OBS-роут в режиме "только слушать"
   * (без микрофона, без permission-попапов). См. app/obs-room.
   * Показывается участникам как явный индикатор "идёт в эфир".
   */
  isBroadcast?: boolean;
}

/**
 * Сигналинг WebRTC: rooms/{roomId}/voiceSignals/{signalId}
 * Firestore используется как транспорт для обмена SDP/ICE между
 * пирами вместо отдельного WebSocket-сервера — официально
 * рекомендуемый Firebase паттерн для serverless-сигналинга.
 * Документ удаляется получателем сразу после обработки.
 */
export interface VoiceSignalDoc {
  from: string;
  to: string;
  kind: "offer" | "answer" | "ice-candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}
