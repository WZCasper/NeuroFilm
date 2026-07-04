"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Play, Loader2, TriangleAlert } from "lucide-react";
import type { PlayerTabSource, MovieRef } from "@/types/player";

type TabId = "trailer" | string;

interface VideoPlayerProps {
  movie: MovieRef;
  posterUrl: string;
  trailerYoutubeKey: string | null;
  sources: PlayerTabSource[];
  /** Если передано — компонент управляется извне (например, комнатой просмотра). */
  controlledTabId?: TabId | null;
  onTabChange?: (tabId: TabId) => void;
  /** Вкладки видны, но не кликабельны (зрители-не-хосты в комнате). */
  readOnly?: boolean;
}

/**
 * СТРОГОЕ ПРАВИЛО: в любой момент времени существует не более одного
 * iframe. По умолчанию — только постер и кнопка Play, без единого
 * iframe в DOM. При выборе вкладки подставляется готовая ссылка в
 * единственный <iframe>; при смене вкладки старый iframe размонтируется
 * (key={displayUrl}), новый создаётся только когда ссылка готова —
 * второй iframe никогда не существует параллельно с первым.
 *
 * Ссылка на трейлер — чистая производная от пропсов (activeTab,
 * trailerYoutubeKey), без состояния и без эффекта: она не требует
 * похода в сеть, поэтому её незачем хранить в useState. Состояние и
 * useEffect ниже используются ТОЛЬКО для реально асинхронного резолва
 * ссылок балансеров (Плеер 1-4) через source.resolveUrl(movie).
 */
export function VideoPlayer({
  movie,
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
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const tabs = useMemo(
    () => [{ id: "trailer" as TabId, label: "Трейлер" }, ...sources.map((s) => ({ id: s.id, label: s.label }))],
    [sources]
  );

  // Асинхронный резолв — только для вкладок-балансеров. Для трейлера и
  // "пустой" вкладки эффект ничего не резолвит и ничего не сбрасывает
  // (итоговые displayUrl/displayError ниже сами учитывают activeTab).
  useEffect(() => {
    if (!isBalancerTab) return;

    const source = sources.find((s) => s.id === activeTab);
    if (!source) return;

    const currentRequestId = ++requestIdRef.current;
    // Это стандартный паттерн "старт асинхронной загрузки в эффекте":
    // синхронно фиксируем "идёт загрузка" и сразу запускаем resolveUrl()
    // ниже; requestIdRef защищает от гонки, если пользователь быстро
    // переключит вкладку ещё раз. Экспериментальное правило react-hooks/
    // set-state-in-effect в eslint-plugin-react-hooks v6 помечает любой
    // синхронный setState в эффекте, включая этот легитимный кейс.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsResolving(true);
    setResolveError(null);
    setResolvedUrl(null);

    source
      .resolveUrl(movie)
      .then((url) => {
        if (requestIdRef.current !== currentRequestId) return; // ответ устарел — игнорируем
        if (!url) {
          setResolveError(`Источник «${source.label}» недоступен для этого фильма.`);
          return;
        }
        setResolvedUrl(url);
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== currentRequestId) return;
        console.error(`Ошибка загрузки источника ${source.id}:`, err);
        setResolveError(`Не удалось загрузить «${source.label}». Попробуйте другой источник.`);
      })
      .finally(() => {
        if (requestIdRef.current === currentRequestId) setIsResolving(false);
      });
  }, [isBalancerTab, activeTab, movie, sources]);

  const trailerUrl = trailerYoutubeKey ? `https://www.youtube.com/embed/${trailerYoutubeKey}?autoplay=1` : null;

  const displayUrl = isTrailerTab ? trailerUrl : isBalancerTab ? resolvedUrl : null;
  const displayError = isTrailerTab
    ? trailerUrl
      ? null
      : "Трейлер недоступен для этого фильма."
    : isBalancerTab
      ? resolveError
      : null;
  const displayResolving = isBalancerTab && isResolving;

  function handleTabClick(tabId: TabId) {
    if (readOnly) return;
    if (isControlled) {
      onTabChange?.(tabId);
    } else {
      setInternalTab(tabId);
    }
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
            <img
              src={posterUrl}
              alt={movie.title}
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
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
            title={`${movie.title} — ${activeTab}`}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="origin"
          />
        )}
      </div>
    </div>
  );
}
