import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { runWebsiteReview } from "@/lib/scan/website-review";
import { constantTimeEquals } from "@/lib/security";
import { pruneExpiredAuthRecords } from "@/lib/services/auth";
import { pruneRateLimits } from "@/lib/services/rate-limit";

export const maxDuration = 300;

/**
 * Weekly website review (see lib/scan/website-review.ts) plus housekeeping.
 * Fails closed without CRON_SECRET. Reports exactly how many sites were
 * fetched and what happened; it never edits listings.
 */
export async function GET(request: NextRequest) {
  const secret = env.cronSecret;
  if (!secret) {
    log.error("cron.unconfigured");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (!constantTimeEquals(header, `Bearer ${secret}`, "cron")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const review = await runWebsiteReview();
    await Promise.all([pruneRateLimits(), pruneExpiredAuthRecords()]);
    return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...review });
  } catch (error) {
    log.error("cron.failed", { error });
    return NextResponse.json({ ok: false, error: "scan_failed" }, { status: 500 });
  }
}
