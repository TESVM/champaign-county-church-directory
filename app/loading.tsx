/** Shown while a server component streams; prevents an apparently frozen page. */
export default function Loading() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <div className="h-8 w-64 animate-pulse rounded-full bg-brand-100" />
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-[28px] border border-line bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
