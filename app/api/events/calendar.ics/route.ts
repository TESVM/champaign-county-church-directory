import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { buildCalendar } from "@/lib/ics";
import { listUpcomingEvents } from "@/lib/services/engagement";
import { siteUrl } from "@/lib/site";

/** Subscribable county-wide calendar (optionally one city). */
export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city") || undefined;
  const occurrences = await listUpcomingEvents({ citySlug: city, days: 180 });
  const ids = [...new Set(occurrences.map((o) => o.eventId))];
  const prisma = await db();
  const events = await prisma.event.findMany({ where: { id: { in: ids } }, include: { church: { select: { slug: true, name: true, address1: true, city: true, state: true } } } });
  const body = buildCalendar(
    events.map((e) => ({
      ...e,
      location: e.location ?? [e.church.name, e.church.address1, e.church.city, e.church.state].filter(Boolean).join(", "),
      url: `${siteUrl()}/churches/${e.church.slug}`,
      description: [e.description, `Hosted by ${e.church.name}`].filter(Boolean).join("\n\n")
    })),
    new URL(siteUrl()).host,
    city ? `Church events — ${city}` : "Champaign County church events"
  );
  return new NextResponse(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="champaign-county-church-events.ics"', "Cache-Control": "public, max-age=900" }
  });
}
