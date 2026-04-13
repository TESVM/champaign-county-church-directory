import { NextRequest, NextResponse } from "next/server";
import { runWeeklyScan } from "@/lib/scan/weekly-scan";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runWeeklyScan();

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    results
  });
}
