/** A small flyer preview that opens the full-size flyer in a new tab. */
export function EventFlyer({ url, title }: { url: string; title: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="focus-ring block w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-stone-50 sm:w-36">
      {/* Flyers come from church uploads or links on many hosts, so a plain img is used. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Flyer for ${title}`} loading="lazy" className="h-48 w-full object-contain sm:h-44" />
      <span className="block border-t border-line px-2 py-1 text-center text-xs font-semibold text-brand-900">View flyer</span>
    </a>
  );
}
