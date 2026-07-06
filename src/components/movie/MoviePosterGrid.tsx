import Link from "next/link";

interface PosterItem {
  tmdbId: number;
  title: string;
  posterUrl: string;
}

export function MoviePosterGrid({ items }: { items: PosterItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <Link key={item.tmdbId} href={`/movie/${item.tmdbId}`} className="group">
          <div className="aspect-[2/3] overflow-hidden rounded-xl bg-neutral-900">
            {item.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.posterUrl}
                alt={item.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-2 text-center text-xs text-neutral-500">
                {item.title}
              </div>
            )}
          </div>
          <p className="mt-1.5 truncate text-sm text-neutral-300">{item.title}</p>
        </Link>
      ))}
    </div>
  );
}
