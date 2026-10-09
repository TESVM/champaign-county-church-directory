/** Hosts the Next.js image optimizer may fetch from (mirrors next.config.mjs). */
const OPTIMIZED_HOSTS = ["images.unsplash.com", "static.wixstatic.com", "cloud-1de12d.becdn.net"];

/**
 * Local files and allow-listed hosts go through the optimizer. Anything else
 * (a church-supplied image link) is rendered directly, so the optimizer is
 * never an open proxy and an unknown host never breaks the page.
 */
export function shouldOptimizeImage(src: string | undefined | null) {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    return OPTIMIZED_HOSTS.includes(host) || host.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
