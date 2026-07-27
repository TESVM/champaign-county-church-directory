/**
 * Scoped to the directory rather than the app root.
 *
 * A root loading.tsx wraps every route in a Suspense boundary, which starts
 * streaming the response before the page body runs. Once streaming begins the
 * 200 status is committed, so notFound() on a church or city page could no
 * longer set a 404 -- a soft 404 that tells search engines a missing church
 * still exists. This route never calls notFound(), so streaming is safe here.
 */
export default function Loading() {
  return (
    <div
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading search results</span>
      <div className="h-10 w-72 animate-pulse rounded-full bg-brand-100" />
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-[28px] border border-line bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
