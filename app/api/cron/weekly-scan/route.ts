import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runWeeklyScan } from "@/lib/scan/weekly-scan";

/**
 * Compares two strings without leaking length or content through timing.
 * Both sides are hashed to a fixed width so `timingSafeEqual` cannot throw.
 */
function constantTimeEquals(a: string, b: string) {
  const key = "cron-comparison";
  const aDigest = createHmac("sha256", key).update(a).digest();
  const bDigest = createHmac("sha256", key).update(b).digest();
  return timingSafeEqual(aDigest, bDigest);
}

export async function GET(request: NextRequest) {
  const secret = env.cronSecret;

  // Fail closed. The previous implementation skipped the check entirely when
  // CRON_SECRET was unset, which left this endpoint publicly readable and, once
  // the scan performs real outbound fetches, usable as a request amplifier.
  if (!secret) {
    console.error("CRON_SECRET is not configured; refusing to run the weekly scan.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !constantTimeEquals(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runWeeklyScan();

    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      results
    });
  } catch (error) {
    // Without this the cron fails silently: Vercel records a 500 and nobody is
    // told the weekly scan stopped running.
    console.error("Weekly scan failed.", error);
    return NextResponse.json({ ok: false, error: "scan_failed" }, { status: 500 });
  }
}
