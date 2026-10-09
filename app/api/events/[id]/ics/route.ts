import { NextResponse } from "next/server";
import { buildCalendar } from "@/lib/ics";
import { getEventForCalendar } from "@/lib/services/engagement";
import { siteUrl } from "@/lib/site";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const event = await getEventForCalendar(id);
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const host = new URL(siteUrl()).host;
  const location = event.location ?? [event.church.name, event.church.address1, event.church.city, event.church.state].filter(Boolean).join(", ");
  const body = buildCalendar(
    [{ ...event, location, url: `${siteUrl()}/churches/${event.church.slug}`, description: [event.description, `Hosted by ${event.church.name}`].filter(Boolean).join("\n\n") }],
    host,
    event.title
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${event.id}.ics"`,
      "Cache-Control": "public, max-age=300"
    }
  });
}
