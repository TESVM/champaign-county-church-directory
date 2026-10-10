import { describe, expect, it } from "vitest";
import { channelIdFromUrl, parseFeed, recentVideos, resolveChannelId } from "@/lib/youtube";

const CH = "UCNfKFNI7PsX3owFaT81oCiw";
const feed = `<?xml version="1.0"?><feed><entry><yt:videoId>abcdefghijk</yt:videoId><title>Sunday Worship &amp; Communion</title><published>2026-10-04T15:30:00+00:00</published><media:thumbnail url="https://i4.ytimg.com/vi/abcdefghijk/hqdefault.jpg" width="480" height="360"/></entry><entry><yt:videoId>zyxwvutsrqp</yt:videoId><title>Older</title><published>2026-09-27T15:30:00+00:00</published></entry></feed>`;

describe("YouTube feed", () => {
  it("reads channel ids only from youtube.com/channel links", () => {
    expect(channelIdFromUrl(`https://www.youtube.com/channel/${CH}?view_as=subscriber`)).toBe(CH);
    expect(channelIdFromUrl("https://www.youtube.com/@grace")).toBeNull();
    expect(channelIdFromUrl(`https://evil.example/channel/${CH}`)).toBeNull();
    expect(channelIdFromUrl("not a url")).toBeNull();
  });

  it("parses entries and decodes titles", () => {
    const videos = parseFeed(feed);
    expect(videos).toHaveLength(2);
    expect(videos[0]).toMatchObject({ id: "abcdefghijk", title: "Sunday Worship & Communion", url: "https://www.youtube.com/watch?v=abcdefghijk" });
    expect(videos[0].thumbnailUrl).toContain("ytimg.com");
    expect(videos[1].thumbnailUrl).toBeNull();
  });

  it("resolves @handles from the channel page and fails quietly", async () => {
    const page = (async () => new Response(`<link rel="canonical" href="https://www.youtube.com/channel/${CH}">`)) as unknown as typeof fetch;
    expect(await resolveChannelId("https://www.youtube.com/@grace/streams", page)).toBe(CH);
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await resolveChannelId("https://www.youtube.com/@grace", down)).toBeNull();
    expect(await recentVideos(CH, down)).toEqual([]);
    expect(await recentVideos("not-a-channel", page)).toEqual([]);
  });
});
