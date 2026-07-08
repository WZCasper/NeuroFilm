"use client";

interface Genre {
  id: number;
  name: string;
}

export function GenreFilter({
  genres,
  activeGenreId,
  onSelect,
}: {
  genres: Genre[];
  activeGenreId: number | null;
  onSelect: (genreId: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
          activeGenreId === null ? "bg-nf-yellow text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
        }`}
      >
        Все
      </button>
      {genres.map((genre) => (
        <button
          key={genre.id}
          type="button"
          onClick={() => onSelect(genre.id)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            activeGenreId === genre.id
              ? "bg-nf-yellow text-black"
              : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          }`}
        >
          {genre.name}
        </button>
      ))}
    </div>
  );
}
