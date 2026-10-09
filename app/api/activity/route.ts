import { NextResponse } from "next/server";
import { authSecret } from "@/lib/env";
import { db } from "@/lib/db";
import { keyedHash } from "@/lib/security";
import { isActivityMetric, recordActivity } from "@/lib/services/engagement";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

/**
 * Counts an anonymous profile action (view, directions, website, …).
 *
 * Stored as a daily total per church. To keep one person from inflating the
 * numbers, a keyed hash of client+church+metric is used as a short-lived
 * de-duplication key (30 minutes); no IP or identifier is stored with counts.
 */
export async function POST(request: Request) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const body = (await request.json().catch(() => null)) as { slug?: unknown; metric?: unknown } | null;
  const slug = typeof body?.slug === "string" && /^[a-z0-9-]{1,100}$/.test(body.slug) ? body.slug : null;
  if (!slug || !isActivityMetric(body?.metric)) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const prisma = await db();
    const windowStart = Math.floor(Date.now() / 1000 / 1800) * 1800;
    const key = `activity:${keyedHash(`${client}|${slug}|${body!.metric}`, authSecret)}`;
    const seen = await prisma.rateLimit.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } }
    });
    if (seen.count === 1) await recordActivity(slug, body!.metric);
    return new NextResponse(null, { status: 204 });
  } catch {
    // Counting is best-effort; never surface an error to the visitor.
    return new NextResponse(null, { status: 204 });
  }
}
