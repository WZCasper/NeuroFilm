# NeuroFilm — Next.js/Firebase основа

Технологии: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Firebase (Firestore + Auth) · Vercel (хостинг + serverless API).

## Что реализовано в этой версии

- Авторизация через Telegram Login Widget (проверка подписи HMAC-SHA256
  на сервере, Firebase custom token).
- Плеер с вкладками «Трейлер / Плеер 1-4»: строго один `<iframe>`
  в любой момент времени, без предзагрузки остальных. Логика Kodik,
  VideoCDN, Bazon и HDVB портирована из текущей рабочей версии сайта —
  это не заглушки, а реальная интеграция с теми же токенами. У Kodik
  дополнительно есть честный переключатель озвучек (запрос к его API
  через `app/api/kodik/search`, без фейковых списков).
- Комнаты совместного просмотра: код комнаты, live-синхронизация
  play/pause/источника через Firestore, список зрителей (online/offline),
  внутренний чат.
- ИИ-ассистент (Gemini) с лимитом 2 бесплатных запроса в сутки на
  пользователя (по Москве), докупаемыми запросами и статусом «безлимит» —
  лимит считается атомарно на сервере, обойти его правкой клиента нельзя.
- Голосовой чат на WebRTC (mesh, до 4-6 говорящих): сигналинг через
  Firestore, без выделенного медиа-сервера. `/obs-room` тихо слушает его
  в режиме receiveOnly (без микрофона и без единого permission-попапа) и
  выводит звук в трансляцию — участники видят явный индикатор эфира.
- Совместная очередь фильмов: поиск по TMDB прямо в комнате, голосование,
  запуск выбранного фильма хостом (заменяет текущий movie/activeSourceId/
  playback комнаты — плеер у всех переключается сам).
- Переключаемые панели чата: свой внутренний чат, встроенный чат Twitch
  и чат YouTube Live — хост указывает канал/ID трансляции прямо в
  настройках комнаты, вкладки появляются только когда что-то настроено.
- Страница фильма (`/movie/[id]`) с реальными данными TMDB (постер,
  бэкдроп, жанры, рейтинг, трейлер), кнопкой «В избранное» и «Смотреть
  вместе». Избранное и история просмотров — на Firestore, привязаны к
  Telegram-аккаунту (в прежней версии сайта это жило в localStorage
  браузера и терялось при смене устройства).
- Поиск по TMDB на главной странице — временная замена полноценной
  витрины с hero-баннером и подборками по жанрам (следующий шаг).
- Роут `/obs-room/[roomId]` для OBS Browser Source: без подписей, без
  чата, без единой возможности показать системное уведомление/PWA-баннер,
  рамки растут только внутрь (`border-box` + `inset`-тень).

## Голосовой чат: границы возможностей

- Полносвязная (mesh) архитектура — комфортно работает для 4-6
  одновременных говорящих. Для больших комнат нужен SFU (например,
  LiveKit Cloud с бесплатным тарифом) — это отдельная инфраструктура,
  здесь не реализовано.
- Без TURN-сервера (см. `.env.local.example`) звонок не установится у
  части пользователей за строгими NAT/корпоративными файрволами — STUN
  решает это для большинства, но не для всех.

## Что НЕ вошло (сознательно, чтобы не выдавать заглушки за готовое)

- Витрина главной страницы старого сайта — hero-баннер с каруселью,
  фильтры по жанрам, подборки Popular/Top Rated/Upcoming/Now Playing.
  Сейчас на главной только рабочий поиск; сама страница фильма, избранное
  и история уже перенесены и работают на реальных данных.
- Push-уведомления — были в старой версии, на Firestore/Web Push пока
  не переносились.
- Реальный платёжный шлюз (для РФ-аудитории Stripe не подходит — нужен
  YooKassa/CloudPayments/Telegram Payments) — ждёт твоего выбора провайдера.
- Сезоны/серии для сериалов у Kodik (в старом сайте эта логика есть,
  но текущая версия NeuroFilm ориентирована на фильмы — типы данных
  под сериалы пока не заведены).

## Twitch/YouTube чат: что нужно знать

- И Twitch, и YouTube требуют, чтобы параметр `parent`/`embed_domain`
  точно совпадал с доменом, на котором открыт сайт — он вычисляется
  динамически на клиенте, поэтому работает одинаково на проде, Vercel
  preview-доменах и localhost без ручной настройки.
- YouTube live-чат встраивается только для видео с активной (или
  недавно завершённой, с сохранённым чатом) Live-трансляцией — для
  обычного видео чат не появится. Twitch-чат канала доступен и в офлайне.
- Каталог, hero-баннер, избранное, история, push-уведомления — это уже
  есть в текущей версии сайта на GitHub Pages и не переносилось.

## Быстрый старт

```bash
npm install
cp .env.local.example .env.local   # и заполнить своими ключами
npm run dev
```

### 1. Firebase

1. Создай проект на console.firebase.google.com (план Spark, бесплатный,
   биллинг не нужен — Cloud Functions в проекте не используются).
2. Authentication → Sign-in method → включи **Custom** (для Telegram-входа
   через custom token) и **Anonymous** (нужен для роута `/obs-room`).
3. Firestore Database → создай базу (production mode).
4. Project settings → General → добавь Web-приложение → скопируй конфиг
   в `NEXT_PUBLIC_FIREBASE_*`.
5. Project settings → Service accounts → Generate new private key →
   значения из JSON пойдут в `FIREBASE_ADMIN_*`.
6. Опубликуй правила: `npx firebase-tools deploy --only firestore:rules`
   (или вставь содержимое `firestore.rules` вручную в консоли).

### 2. Telegram

1. Напиши @BotFather → `/newbot` → получи токен → `TELEGRAM_BOT_TOKEN`.
2. `/setdomain` → укажи домен, на котором будет жить сайт (для локальной
   разработки Telegram Login Widget домен localhost не поддерживает —
   тестировать вход нужно на реальном домене, например через Vercel preview).
3. Имя бота (без @) → `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.

### 3. Gemini

Ключ на aistudio.google.com/apikey → `GEMINI_API_KEY`.

### 4. Деплой

Vercel → Import Project → указать все переменные из `.env.local` в
Project Settings → Environment Variables (включая многострочный
`FIREBASE_ADMIN_PRIVATE_KEY` как есть, с `\n`).

## Структура

```
src/
  app/
    layout.tsx              — корневой layout (только AuthProvider)
    (main)/                 — обычные страницы сайта (шапка + провайдеры UI)
      page.tsx               — главная: поиск по TMDB
      movie/[id]/            — страница фильма (реальные данные TMDB)
      favorites/, history/   — избранное и история (Firestore)
      assistant/             — ИИ-подбор фильмов
      room/[roomId]/         — комната просмотра
    obs-room/[roomId]/      — минимальный роут для OBS Browser Source
    api/
      auth/telegram/        — проверка подписи Telegram → custom token
      ai/chat/               — прокси к Gemini + атомарный лимит запросов
      tmdb/search/           — прокси к поиску TMDB (для очереди и поиска)
      kodik/search/          — прокси к kodikapi.com (список озвучек)
  components/
    player/VideoPlayer.tsx  — плеер с вкладками (один iframe)
    movie/                  — FavoriteButton, HistoryLogger, MoviePosterGrid
    room/                   — RoomSidebar (композиция), чат, зрители,
                              голосовой чат, очередь, Twitch/YouTube embed
    ai/AIChatWidget.tsx     — интерфейс ИИ-ассистента + paywall
    auth/, layout/
  hooks/                    — useAuth, useRoomSync, useNow, useVoiceChat,
                              usePlaylist, useHostname, useFavorites, useWatchHistory
  lib/                      — firebase (client/admin), player-sources, rooms,
                              webrtc/config, tmdb.ts, library.ts
  types/
firestore.rules             — безопасность: клиент не может сам себе
                               выставить aiUnlimited/aiCredits
```
