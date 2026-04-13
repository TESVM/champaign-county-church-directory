export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-line bg-surface p-10 text-center">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-3 text-sm text-stone-600">{body}</p>
    </div>
  );
}
