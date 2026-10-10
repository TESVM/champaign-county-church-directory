import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { billingConfigured } from "@/lib/services/billing";

export const dynamic = "force-dynamic";

/**
 * Liveness and configuration check for uptime monitors. Reports which
 * integrations are configured (true/false only); never returns secret values.
 */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "unavailable" = "unavailable";
  let churches: number | null = null;
  try {
    const prisma = await db();
    churches = await prisma.church.count({ where: { status: "ACTIVE" } });
    database = "ok";
  } catch {
    database = "unavailable";
  }

  const body = {
    status: database === "ok" ? "ok" : "degraded",
    time: new Date().toISOString(),
    latencyMs: Date.now() - started,
    checks: {
      database,
      activeChurches: churches,
      email: env.emailProvider === "resend" && env.resendApiKey && env.emailFrom ? "configured" : "log-only (not delivered)",
      billing: billingConfigured() ? "configured" : "not configured",
      uploads: env.mediaDriver === "blob" && env.blobToken ? "blob" : env.isProduction ? "not configured" : "local (development)",
      cron: env.cronSecret ? "configured" : "not configured"
    }
  };
  return NextResponse.json(body, { status: database === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
