import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { SectionHeading } from "@/components/layout/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField } from "@/components/ui/field";
import { listCities } from "@/lib/services/churches";
import { listUpcomingEvents } from "@/lib/services/engagement";
import { formatChicago } from "@/lib/time/chicago";

export const metadata: Metadata = {
  title: "Church Events Calendar",
  description: "Upcoming events at churches across Champaign County, Illinois, with calendar downloads.",
  alternates: { canonical: "/events" }
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const { city } = await searchParams;
  const [occurrences, cities] = await Promise.all([listUpcomingEvents({ citySlug: city || undefined, days: 90 }), listCities()]);
  const byDate = new Map<string, typeof occurrences>();
  for (const o of occurrences) byDate.set(o.date, [...(byDate.get(o.date) ?? []), o]);
  const calendarQuery = city ? `?city=${encodeURIComponent(city)}` : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="Events"
        title="Church events across Champaign County"
        description="The next 90 days. Times are Central Time. Events are posted by the churches; confirm details with the host church."
      />
      <form action="/events" className="mt-8 flex flex-wrap items-end gap-3 rounded-[24px] border border-line bg-white p-4 shadow-card">
        <div className="min-w-[220px] flex-1">
          <SelectField name="city" label="City" defaultValue={city ?? ""} options={[{ value: "", label: "All cities" }, ...cities.map((c) => ({ value: c.slug, label: c.name }))]} />
        </div>
        <button type="submit" className="min-h-[44px] rounded-full bg-brand-900 px-6 font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
          Show events
        </button>
        <a href={`/api/events/calendar.ics${calendarQuery}`} className="inline-flex min-h-[44px] items-center px-3 text-sm font-semibold text-brand-900 underline-offset-4 hover:underline">
          Download calendar (.ics)
        </a>
      </form>

      {byDate.size ? (
        <div className="mt-8 space-y-8">
          {[...byDate.entries()].map(([date, items]) => (
            <section key={date} aria-labelledby={`d-${date}`}>
              <h2 id={`d-${date}`} className="font-display text-2xl">
                {formatChicago(items[0].startsAt, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h2>
              <ul className="mt-3 space-y-3">
                {items.map((event) => (
                  <li key={`${event.eventId}-${event.date}`} className="rounded-[20px] border border-line bg-white p-4 shadow-card">
                    <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      {event.startTime ? formatChicago(event.startsAt, { hour: "numeric", minute: "2-digit" }) : "All day"}
                      {event.recurrence === "WEEKLY" ? " · weekly" : ""}
                    </p>
                    <p className="mt-1 font-display text-xl">{event.title}</p>
                    <p className="text-sm text-stone-700">
                      <Link href={`/churches/${event.church.slug}`} className="font-semibold underline-offset-4 hover:underline">
                        {event.church.name}
                      </Link>{" "}
                      · {event.church.city}
                    </p>
                    {event.location ? (
                      <p className="mt-1 flex items-center gap-1 text-sm text-stone-600">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {event.location}
                      </p>
                    ) : null}
                    {event.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-700">{event.description}</p> : null}
                    <p className="mt-2 flex flex-wrap gap-4 text-sm">
                      <a href={`/api/events/${event.eventId}/ics`} className="font-semibold text-brand-900 underline-offset-4 hover:underline">
                        Add to calendar
                      </a>
                      {event.registrationUrl ? (
                        <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand-900 underline-offset-4 hover:underline">
                          Register
                        </a>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No upcoming events posted yet"
            body="Churches with an Enhanced Church Profile can post events here. Check individual church websites for their latest news."
          />
        </div>
      )}
    </div>
  );
}
