/**
 * STUN нужен, чтобы пиры узнали свой публичный адрес для прямого
 * P2P-соединения — он бесплатный и работает "из коробки". TURN нужен
 * как запасной вариант, когда прямое соединение невозможно (симметричный
 * NAT, строгий корпоративный файрвол) — по опыту, это заметная часть
 * реальных пользователей, поэтому без TURN голосовой чат будет работать
 * у большинства, но не у всех. Бесплатного TURN "из коробки" с гарантией
 * работы не существует (TURN сам ретранслирует медиатрафик и стоит
 * трафика), поэтому это — точка расширения через переменные окружения,
 * а не встроенное значение по умолчанию.
 *
 * Варианты с бесплатным тарифом по регистрации: metered.ca, Xirsys,
 * OpenRelay Project. После регистрации у любого из них — просто заполни
 * NEXT_PUBLIC_TURN_*, код менять не нужно.
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
  }

  return servers;
}
