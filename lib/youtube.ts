import { log } from "@/lib/log";

/**
 * Recent videos from a church's public YouTube channel, read from YouTube's
 * public RSS feed (no API key, no tracking). Nothing here can tell whether a
 * channel is live, so it is only used for "recent services".
 */

export type YouTubeVideo = { id: string; title: string; url: string; publishedAt: Date; thumbnailUrl: string | null };

const CHANNEL_ID = /^UC[\w-]{22}$/;

/** The channel id when the link names it directly (youtube.com/channel/UC…). */
export function channelIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)youtube\.com$/.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/channel\/(UC[\w-]{22})/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Resolves @handle, /c/ and /user/ links by reading the channel page's canonical link. */
export async function resolveChannelId(url: string | null | undefined, fetcher: typeof fetch = fetch): Promise<string | null> {
  const direct = channelIdFromUrl(url);
  if (direct || !url) return direct;
  try {
    const u = new URL(url);
    if (!/(^|\.)youtube\.com$/.test(u.hostname) || !/^\/(@[\w.-]+|c\/|user\/)/.test(u.pathname)) return null;
    const res = await fetcher(`https://www.youtube.com${u.pathname.split("/").slice(0, u.pathname.startsWith("/@") ? 2 : 3).join("/")}`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86_400 }
    } as RequestInit);
    if (!res.ok) return null;
    const m = (await res.text()).match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/);
    return m && CHANNEL_ID.test(m[1]) ? m[1] : null;
  } catch (error) {
    log.warn("youtube.resolve_failed", { error });
    return null;
  }
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function parseFeed(xml: string): YouTubeVideo[] {
  const out: YouTubeVideo[] = [];
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    if (!id || !title || !published) continue;
    const thumb = entry.match(/<media:thumbnail url="([^"]+)"/)?.[1] ?? null;
    out.push({ id, title: decode(title.trim()), url: `https://www.youtube.com/watch?v=${id}`, publishedAt: new Date(published), thumbnailUrl: thumb && thumb.startsWith("https://i") ? thumb : null });
  }
  return out;
}

export async function recentVideos(channelId: string, fetcher: typeof fetch = fetch, limit = 3): Promise<YouTubeVideo[]> {
  if (!CHANNEL_ID.test(channelId)) return [];
  try {
    const res = await fetcher(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } } as RequestInit);
    if (!res.ok) return [];
    return parseFeed(await res.text()).slice(0, limit);
  } catch (error) {
    log.warn("youtube.feed_failed", { error });
    return [];
  }
}
