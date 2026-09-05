export function ChatEmbedLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-neutral-500">Загрузка чата {label}…</div>
  );
}
