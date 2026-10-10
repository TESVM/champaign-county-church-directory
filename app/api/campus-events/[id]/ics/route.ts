import { NextResponse } from "next/server";
import { buildCalendar } from "@/lib/ics";
import { getCampusEventForCalendar } from "@/lib/services/campus";
import { siteUrl } from "@/lib/site";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const event = await getCampusEventForCalendar(id);
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const host = new URL(siteUrl()).host;
  const url = event.organization ? `${siteUrl()}/campus/organizations/${event.organization.slug}` : `${siteUrl()}/campus/events`;
  const description = [event.description, event.organization ? `Hosted by ${event.organization.name}` : null, event.registrationUrl ? `Register: ${event.registrationUrl}` : null].filter(Boolean).join("\n\n");
  const body = buildCalendar([{ ...event, url, description }], host, event.title);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="campus-event-${event.id}.ics"`,
      "Cache-Control": "public, max-age=300"
    }
  });
}
