import { NextResponse, type NextRequest } from "next/server";
import { listChurches } from "@/lib/services/churches";
import { log } from "@/lib/log";

/** Summaries for the visitor's saved churches (slugs held only in their browser). */
export async function GET(request: NextRequest) {
  const slugs = (request.nextUrl.searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,100}$/.test(s))
    .slice(0, 100);
  if (!slugs.length) return NextResponse.json({ ok: true, data: [] });
  try {
    const { items } = await listChurches({ slugs }, 1, 100);
    return NextResponse.json({
      ok: true,
      data: items.map((c) => ({
        slug: c.slug,
        name: c.name,
        city: c.city,
        address: c.address1,
        services: c.serviceTimes.map((s) => `${s.dayOfWeek} ${s.startTime}`).join(" · ")
      }))
    });
  } catch (error) {
    log.error("lookup.failed", { error });
    return NextResponse.json({ ok: false, error: "We could not load your saved churches right now." }, { status: 503 });
  }
}
