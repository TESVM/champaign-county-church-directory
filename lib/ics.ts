import { addDays, chicagoToUtc } from "@/lib/time/chicago";

/**
 * iCalendar (RFC 5545) output for church events.
 *
 * Times are written as America/Chicago local times with a VTIMEZONE block, so
 * calendar apps keep a weekly 7:00 PM event at 7:00 PM after daylight saving
 * changes instead of shifting it by an hour.
 */

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:America/Chicago",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0600",
  "TZOFFSETTO:-0500",
  "TZNAME:CDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0600",
  "TZNAME:CST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE"
];

export function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets as the spec requires. */
export function foldLine(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function local(date: string, time: string) {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

function utcStamp(instant: Date) {
  return instant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export type IcsEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  startDate: string;
  startTime?: string | null;
  endTime?: string | null;
  recurrence: "NONE" | "WEEKLY";
  recurrenceUntil?: string | null;
  updatedAt: Date;
};

export function eventToVevent(event: IcsEvent, host: string) {
  const lines = ["BEGIN:VEVENT", `UID:${event.id}@${host}`, `DTSTAMP:${utcStamp(event.updatedAt)}`];

  if (event.startTime) {
    lines.push(`DTSTART;TZID=America/Chicago:${local(event.startDate, event.startTime)}`);
    const end = event.endTime ?? (() => {
      const [h, m] = event.startTime!.split(":").map(Number);
      const total = Math.min(h * 60 + m + 60, 23 * 60 + 59);
      return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    })();
    lines.push(`DTEND;TZID=America/Chicago:${local(event.startDate, end)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${event.startDate.replace(/-/g, "")}`);
    lines.push(`DTEND;VALUE=DATE:${addDays(event.startDate, 1).replace(/-/g, "")}`);
  }

  if (event.recurrence === "WEEKLY" && event.recurrenceUntil) {
    // UNTIL must be UTC when DTSTART has a TZID: use the end of the last day in Chicago.
    const until = chicagoToUtc(event.recurrenceUntil, "23:59");
    lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${utcStamp(until)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push("END:VEVENT");
  return lines;
}

export function buildCalendar(events: IcsEvent[], host: string, name = "Champaign County church events") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Champaign County Church Directory//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(name)}`,
    "X-WR-TIMEZONE:America/Chicago",
    ...VTIMEZONE,
    ...events.flatMap((event) => eventToVevent(event, host)),
    "END:VCALENDAR"
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
