import Link from "next/link";

/** Real page links that keep the current filters. */
export function Pagination({
  page,
  pageCount,
  basePath,
  params
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value && key !== "page") search.set(key, value);
    if (p > 1) search.set("page", String(p));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2);
  const base = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold focus-ring";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 pt-6">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${base} border border-line bg-white text-ink hover:border-brand-700`} rel="prev">
          Previous
        </Link>
      ) : null}
      {pages.map((p, index) => (
        <span key={p} className="contents">
          {index > 0 && p - pages[index - 1] > 1 ? <span className="px-1 text-stone-500" aria-hidden="true">…</span> : null}
          {p === page ? (
            <span aria-current="page" className={`${base} bg-brand-900 text-white`}>
              <span className="sr-only">Page </span>{p}
            </span>
          ) : (
            <Link href={href(p)} className={`${base} border border-line bg-white text-ink hover:border-brand-700`}>
              <span className="sr-only">Page </span>{p}
            </Link>
          )}
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={`${base} border border-line bg-white text-ink hover:border-brand-700`} rel="next">
          Next
        </Link>
      ) : null}
    </nav>
  );
}
