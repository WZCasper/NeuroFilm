"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Play, Loader2, TriangleAlert } from "lucide-react";
import type { PlayerTabSource, MediaRef, PlayerDub } from "@/types/player";

type TabId = "trailer" | string;

interface VideoPlayerProps {
  media: MediaRef;
  posterUrl: string;
  trailerYoutubeKey: string | null;
  sources: PlayerTabSource[];
  /** Если передано — компонент управляется извне (например, комнатой просмотра) */
  controlledTabId?: TabId | null;
  onTabChange?: (tabId: TabId) => void;
  /** Вкладки видны, но не кликабельны (зрители-не-хосты в комнате) */
  readOnly?: boolean;
}

function sortedNumberKeys(obj: Record<number, unknown> | undefined): number[] {
  if (!obj) return [];
  return Object.keys(obj).map(Number).sort((a, b) => a - b);
}

/**
 * СТРОГОЕ ПРАВИЛО: в любой момент времени существует не более одного
 * iframe. По умолчанию — только постер и кнопка Play, без единого
 * iframe в DOM. При выборе вкладки подставляется готовая ссылка в
 * единственный <iframe>; при смене вкладки старый iframe размонтируется
 * (key={displayUrl}), новый создаётся только когда ссылка готова.
 *
 * Для сериалов (media.mediaType === "tv") Kodik отдаёт ВСЮ карту
 * сезон->серия->ссылка одним запросом (см. resolveKodik в
 * player-sources.ts) — переключение серии внутри уже полученных данных
 * происходит на клиенте, без повторного похода в API.
 */
export function VideoPlayer({
  media,
  posterUrl,
  trailerYoutubeKey,
  sources,
  controlledTabId,
  onTabChange,
  readOnly = false,
}: VideoPlayerProps) {
  const isControlled = controlledTabId !== undefined;
  const [internalTab, setInternalTab] = useState<TabId | null>(null);
  const activeTab = isControlled ? controlledTabId : internalTab;
  const isTrailerTab = activeTab === "trailer";
  const isBalancerTab = activeTab != null && !isTrailerTab;

  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [dubs, setDubs] = useState<PlayerDub[] | null>(null);
  const [activeDubId, setActiveDubId] = useState<PlayerDub["id"] | null>(null);
  const [activeSeason, setActiveSeason] = useState<number | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const tabs = useMemo(
    () => [{ id: "trailer" as TabId, label: "Трейлер" }, ...sources.map((s) => ({ id: s.id, label: s.label }))],
    [sources]
  );

  // Асинхронный резолв — только для вкладок-балансеров
  useEffect(() => {
    if (!isBalancerTab) return;

    const source = sources.find((s) => s.id === activeTab);
    if (!source) return;

    const currentRequestId = ++requestIdRef.current;
    // Стандартный паттерн "старт асинхронной загрузки в эффекте" —
    // requestIdRef защищает от гонки при быстром переключении вкладок.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsResolving(true);
    setResolveError(null);
    setResolvedUrl(null);
    setDubs(null);
    setActiveDubId(null);
    setActiveSeason(null);
    setActiveEpisode(null);

    source
      .resolveUrl(media)
      .then((result) => {
        if (requestIdRef.current !== currentRequestId) return; // ответ устарел — игнорируем
        if (!result) {
          setResolveError(`Источник «${source.label}» недоступен для этого тайтла.`);
          return;
        }

        setResolvedUrl(result.url);
        const firstDub = result.dubs?.[0];
        if (!firstDub) return;

        setDubs(result.dubs ?? null);
        setActiveDubId(firstDub.id);

        const seasons = sortedNumberKeys(firstDub.episodes);
        if (seasons.length > 0) {
          const requestedSeason = media.mediaType === "tv" ? media.season : undefined;
          const requestedEpisode = media.mediaType === "tv" ? media.episode : undefined;
          const season =
            requestedSeason != null && firstDub.episodes?.[requestedSeason] ? requestedSeason : seasons[0];
          const episodes = sortedNumberKeys(firstDub.episodes?.[season]);
          const episode =
            requestedEpisode != null && firstDub.episodes?.[season]?.[requestedEpisode]
              ? requestedEpisode
              : episodes[0];
          setActiveSeason(season);
          setActiveEpisode(episode ?? null);
        }
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== currentRequestId) return;
        console.error(`Ошибка загрузки источника ${source.id}:`, err);
        setResolveError(`Не удалось загрузить «${source.label}». Попробуйте другой источник.`);
      })
      .finally(() => {
        if (requestIdRef.current === currentRequestId) setIsResolving(false);
      });
  }, [isBalancerTab, activeTab, media, sources]);

  const trailerUrl = trailerYoutubeKey ? `https://www.youtube.com/embed/${trailerYoutubeKey}?autoplay=1` : null;

  const displayUrl = isTrailerTab ? trailerUrl : isBalancerTab ? resolvedUrl : null;
  const displayError = isTrailerTab
    ? trailerUrl
      ? null
      : "Трейлер недоступен для этого тайтла."
    : isBalancerTab
      ? resolveError
      : null;
  const displayResolving = isBalancerTab && isResolving;

  const activeDub = dubs?.find((d) => d.id === activeDubId) ?? null;
  const availableSeasons = sortedNumberKeys(activeDub?.episodes);
  const availableEpisodes = activeSeason != null ? sortedNumberKeys(activeDub?.episodes?.[activeSeason]) : [];

  function handleTabClick(tabId: TabId) {
    if (readOnly) return;
    if (isControlled) {
      onTabChange?.(tabId);
    } else {
      setInternalTab(tabId);
    }
  }

  function handleDubSelect(dub: PlayerDub) {
    setActiveDubId(dub.id);
    const seasons = sortedNumberKeys(dub.episodes);
    if (seasons.length === 0) {
      setActiveSeason(null);
      setActiveEpisode(null);
      setResolvedUrl(dub.url);
      return;
    }
    const season = activeSeason != null && dub.episodes?.[activeSeason] ? activeSeason : seasons[0];
    const episodes = sortedNumberKeys(dub.episodes?.[season]);
    const episode = activeEpisode != null && dub.episodes?.[season]?.[activeEpisode] ? activeEpisode : episodes[0];
    setActiveSeason(season);
    setActiveEpisode(episode ?? null);
    setResolvedUrl((episode != null ? dub.episodes?.[season]?.[episode] : undefined) ?? dub.url);
  }

  function handleSeasonSelect(season: number) {
    if (!activeDub?.episodes?.[season]) return;
    const episodes = sortedNumberKeys(activeDub.episodes[season]);
    const episode = episodes[0];
    setActiveSeason(season);
    setActiveEpisode(episode ?? null);
    if (episode != null) setResolvedUrl(activeDub.episodes[season][episode]);
  }

  function handleEpisodeSelect(episode: number) {
    if (activeSeason == null) return;
    const url = activeDub?.episodes?.[activeSeason]?.[episode];
    if (!url) return;
    setActiveEpisode(episode);
    setResolvedUrl(url);
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="Источники видео">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            disabled={readOnly}
            onClick={() => handleTabClick(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-nf-yellow text-black"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            } ${readOnly ? "cursor-default opacity-80" : "cursor-pointer"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-neutral-800">
        {activeTab == null && !readOnly && (
          <button
            type="button"
            onClick={() => handleTabClick("trailer")}
            className="group absolute inset-0 flex items-center justify-center"
            aria-label="Смотреть трейлер"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterUrl} alt={media.title} className="absolute inset-0 h-full w-full object-cover opacity-60" />
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-nf-yellow transition-transform group-hover:scale-110">
              <Play className="h-7 w-7 text-black" fill="black" />
            </span>
          </button>
        )}

        {displayResolving && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <Loader2 className="h-8 w-8 animate-spin text-nf-yellow" />
          </div>
        )}

        {displayError && !displayResolving && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 px-6 text-center">
            <TriangleAlert className="h-6 w-6 text-nf-yellow" />
            <p className="text-sm text-neutral-300">{displayError}</p>
          </div>
        )}

        {displayUrl && !displayResolving && (
          <iframe
            key={displayUrl}
            src={displayUrl}
            title={`${media.title} — ${activeTab}`}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="origin"
          />
        )}
      </div>

      {isBalancerTab && dubs && dubs.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Озвучка">
          {dubs.map((dub) => (
            <button
              key={dub.id}
              type="button"
              onClick={() => handleDubSelect(dub)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                dub.id === activeDubId
                  ? "bg-nf-yellow text-black"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {dub.title}
            </button>
          ))}
        </div>
      )}

      {isBalancerTab && availableSeasons.length > 0 && (
        <div className="mt-2 space-y-1.5" role="group" aria-label="Сезоны и серии">
          {availableSeasons.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {availableSeasons.map((season) => (
                <button
                  key={season}
                  type="button"
                  onClick={() => handleSeasonSelect(season)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    season === activeSeason
                      ? "bg-nf-yellow text-black"
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  Сезон {season}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {availableEpisodes.map((episode) => (
              <button
                key={episode}
                type="button"
                onClick={() => handleEpisodeSelect(episode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  episode === activeEpisode
                    ? "bg-nf-yellow text-black"
                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {episode}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
