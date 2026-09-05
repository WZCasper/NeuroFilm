import Link from "next/link";

export interface MovieRowItem {
  tmdbId: number;
  title: string;
  posterUrl: string;
}

export function MovieRow({ title, items }: { title: string; items: MovieRowItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold text-white">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link key={item.tmdbId} href={`/movie/${item.tmdbId}`} className="group w-32 shrink-0 sm:w-36">
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
    </section>
  );
}
