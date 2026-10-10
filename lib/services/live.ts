import { type Actor, assertCanEditChurch } from "@/lib/actor";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { featureVisible } from "@/lib/plans";
import { audit } from "@/lib/services/audit";
import { churchInclude, mapChurchRow } from "@/lib/services/churches";
import { computeEntitlement } from "@/lib/services/entitlements";
import { nextService } from "@/lib/time/next-service";
import type { ChurchRecord } from "@/lib/types";
import { recentVideos, resolveChannelId, type YouTubeVideo } from "@/lib/youtube";

/**
 * Worship Live & Next. A church is shown as live only after its own team (or
 * directory staff) says so, and the status expires on its own after the
 * period they chose. Nothing is inferred from schedules or video feeds.
 */

export const LIVE_HOURS = [1, 2, 3, 4] as const;

export async function markLive(actor: Actor, churchId: string, hours: number) {
  assertCanEditChurch(actor, churchId);
  if (!LIVE_HOURS.includes(hours as (typeof LIVE_HOURS)[number])) throw new ValidationError("Choose how long the stream will run.", { hours: "Choose 1 to 4 hours." });
  const prisma = await db();
  const church = await prisma.church.findUnique({ where: { id: churchId }, include: { subscription: true } });
  if (!church) throw new NotFoundError();
  if (!church.livestreamUrl) throw new ValidationError("Add your livestream link to the listing first.", { livestreamUrl: "Needed to mark the church live." });
  const entitled = computeEntitlement({ complimentaryPremiumUntil: church.complimentaryPremiumUntil, subscription: church.subscription }).active;
  if (!featureVisible("livestream", entitled) && !actor.staffRole) throw new ForbiddenError("The livestream button is part of the Enhanced Church Profile.");
  const now = new Date();
  await prisma.church.update({ where: { id: churchId }, data: { liveUntil: new Date(now.getTime() + hours * 3_600_000), liveMarkedAt: now, liveMarkedBy: actor.email } });
  await audit(actor, { action: "church.live_started", entityType: "Church", entityId: churchId, churchId, summary: `Marked live for ${hours} hour${hours === 1 ? "" : "s"}` });
}

export async function endLive(actor: Actor, churchId: string) {
  assertCanEditChurch(actor, churchId);
  const prisma = await db();
  await prisma.church.update({ where: { id: churchId }, data: { liveUntil: null } });
  await audit(actor, { action: "church.live_ended", entityType: "Church", entityId: churchId, churchId, summary: "Ended live status" });
}

export function isLive(church: { liveUntil?: Date | string | null }, now = new Date()) {
  return Boolean(church.liveUntil && new Date(church.liveUntil).getTime() > now.getTime());
}

export type LiveEntry = { church: ChurchRecord; markedAt: Date | null; until: Date };
export type NextEntry = { church: ChurchRecord; at: Date; label: string; serviceName: string; watchUrl: string | null };
export type RecentEntry = { church: ChurchRecord; video: YouTubeVideo };

/** YouTube links a church has published: livestream link first, then its YouTube social link. */
function youtubeLinks(church: ChurchRecord) {
  return [church.livestreamUrl, ...church.socialLinks.filter((l) => l.platform === "youtube").map((l) => l.url)].filter((u): u is string => Boolean(u));
}

export async function getWorshipHub(options: { now?: Date; fetcher?: typeof fetch; nextLimit?: number } = {}) {
  const now = options.now ?? new Date();
  const prisma = await db();
  const rows = await prisma.church.findMany({ where: { status: "ACTIVE" }, include: churchInclude });

  const live: LiveEntry[] = [];
  const next: NextEntry[] = [];
  const streaming: ChurchRecord[] = [];
  for (const row of rows) {
    const church = mapChurchRow(row, now);
    const canStream = Boolean(church.livestreamUrl && featureVisible("livestream", church.enhancedProfile));
    if (canStream && isLive(row, now)) live.push({ church, markedAt: row.liveMarkedAt, until: row.liveUntil! });
    const n = nextService(church.serviceDetails ?? [], now);
    if (n) next.push({ church, at: n.at, label: n.label, serviceName: n.serviceName, watchUrl: canStream ? church.livestreamUrl! : null });
    if (featureVisible("livestream", church.enhancedProfile) && youtubeLinks(church).length) streaming.push(church);
  }
  next.sort((a, b) => a.at.getTime() - b.at.getTime() || Number(Boolean(b.church.featured)) - Number(Boolean(a.church.featured)));

  const recent: RecentEntry[] = [];
  await Promise.all(
    streaming.map(async (church) => {
      for (const link of youtubeLinks(church)) {
        const channel = await resolveChannelId(link, options.fetcher);
        if (!channel) continue;
        const videos = await recentVideos(channel, options.fetcher, 1);
        if (videos[0]) recent.push({ church, video: videos[0] });
        break;
      }
    })
  );
  recent.sort((a, b) => b.video.publishedAt.getTime() - a.video.publishedAt.getTime());

  return { live, next: next.slice(0, options.nextLimit ?? 12), recent: recent.slice(0, 9), checkedAt: now };
}

/** The latest public video for one church's profile, when it has the livestream feature. */
export async function latestServiceVideo(church: ChurchRecord, fetcher?: typeof fetch) {
  if (!featureVisible("livestream", church.enhancedProfile)) return null;
  for (const link of youtubeLinks(church)) {
    const channel = await resolveChannelId(link, fetcher);
    if (channel) return (await recentVideos(channel, fetcher, 1))[0] ?? null;
  }
  return null;
}
