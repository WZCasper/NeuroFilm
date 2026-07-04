"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, ThumbsUp, X, Play, Search, Loader2 } from "lucide-react";
import { usePlaylist, type PlaylistItemView } from "@/hooks/usePlaylist";
import { useAuth } from "@/hooks/useAuth";

interface TmdbSearchResult {
  tmdbId: number;
  title: string;
  year?: number;
  posterUrl: string | null;
}

const SEARCH_DEBOUNCE_MS = 400;

export function PlaylistPanel({ roomId, hostId, isHost }: { roomId: string; hostId: string; isHost: boolean }) {
  const { user } = useAuth();
  const { items, addToQueue, toggleVote, removeItem, playNext } = usePlaylist(roomId);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = searchTerm.trim();
    if (!trimmed) return; // ничего не резолвим — ниже displayResults сам учитывает пустой ввод

    debounceRef.current = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/tmdb/search?query=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => setSearchResults(data.results ?? []))
        .catch((err: unknown) => console.error("Ошибка поиска в TMDB:", err))
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const trimmedSearchTerm = searchTerm.trim();
  const displayResults = trimmedSearchTerm ? searchResults : [];

  async function handleAdd(result: TmdbSearchResult) {
    await addToQueue(result);
    setIsSearchOpen(false);
    setSearchTerm("");
    setSearchResults([]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Очередь ({items.length})</p>
        <button
          type="button"
          onClick={() => setIsSearchOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-nf-yellow px-2.5 py-1 text-xs font-medium text-black transition-colors hover:bg-nf-yellow-bright"
        >
          <Plus className="h-3.5 w-3.5" />
          Предложить
        </button>
      </div>

      {isSearchOpen && (
        <div className="border-b border-neutral-800 px-3 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Название фильма…"
              className="w-full rounded-lg bg-neutral-900 py-1.5 pl-8 pr-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-nf-yellow"
            />
          </div>

          {isSearching && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-nf-yellow" />
            </div>
          )}

          {!isSearching && trimmedSearchTerm && displayResults.length === 0 && (
            <p className="py-2 text-center text-xs text-neutral-500">Ничего не найдено</p>
          )}

          {!isSearching && displayResults.length > 0 && (
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
              {displayResults.map((result) => (
                <button
                  key={result.tmdbId}
                  type="button"
                  onClick={() => handleAdd(result)}
                  className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-neutral-800"
                >
                  {result.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.posterUrl} alt="" className="h-10 w-7 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-7 shrink-0 rounded bg-neutral-800" />
                  )}
                  <span className="truncate text-sm text-neutral-200">
                    {result.title}
                    {result.year && <span className="text-neutral-500"> ({result.year})</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
        {items.length === 0 && <p className="text-xs text-neutral-500">Очередь пуста — предложите первый фильм.</p>}
        {items.map((item) => (
          <PlaylistRow
            key={item.id}
            item={item}
            myUid={user?.uid}
            isHost={isHost}
            onVote={() => toggleVote(item)}
            onRemove={() => removeItem(item.id)}
            onPlayNext={() => playNext(item, hostId)}
          />
        ))}
      </div>
    </div>
  );
}

function PlaylistRow({
  item,
  myUid,
  isHost,
  onVote,
  onRemove,
  onPlayNext,
}: {
  item: PlaylistItemView;
  myUid: string | undefined;
  isHost: boolean;
  onVote: () => void;
  onRemove: () => void;
  onPlayNext: () => void;
}) {
  const hasVoted = Boolean(myUid && item.votes.includes(myUid));
  const canRemove = isHost || item.suggestedBy === myUid;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-neutral-900 px-2 py-1.5">
      {item.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.posterUrl} alt="" className="h-10 w-7 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-10 w-7 shrink-0 rounded bg-neutral-800" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neutral-100">{item.title}</p>
        <p className="truncate text-xs text-neutral-500">предложил(а) {item.suggestedByName}</p>
      </div>

      <button
        type="button"
        onClick={onVote}
        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors ${
          hasVoted ? "bg-nf-yellow text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
        }`}
      >
        <ThumbsUp className="h-3 w-3" />
        {item.votes.length}
      </button>

      {isHost && (
        <button
          type="button"
          onClick={onPlayNext}
          className="shrink-0 rounded-full bg-nf-yellow p-1.5 text-black transition-colors hover:bg-nf-yellow-bright"
          aria-label="Смотреть сейчас"
        >
          <Play className="h-3 w-3" />
        </button>
      )}

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-red-400"
          aria-label="Убрать из очереди"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
