/**
 * America/Chicago wall-clock helpers, without a date library.
 *
 * Events and services are entered as local times ("7:00 PM on March 8"). The
 * UTC instant for that wall time depends on whether daylight saving applies on
 * that date, so it is computed per date rather than with a fixed offset.
 */

export const TIME_ZONE = "America/Chicago";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

function zonedParts(instant: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

/** Offset of America/Chicago from UTC at `instant`, in minutes (e.g. -300 in summer). */
export function chicagoOffsetMinutes(instant: Date): number {
  const p = zonedParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - instant.getTime()) / 60000);
}

export function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isValidTimeString(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Converts a Chicago wall-clock date and time ("2026-03-08", "19:00") to a UTC
 * instant. For the skipped hour in spring the time is moved forward; for the
 * repeated hour in autumn the first (daylight) occurrence is used.
 */
export function chicagoToUtc(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes converge for every real offset change.
  let offset = chicagoOffsetMinutes(new Date(guess - 6 * 3600 * 1000));
  let instant = guess - offset * 60000;
  const second = chicagoOffsetMinutes(new Date(instant));
  if (second !== offset) {
    offset = second;
    instant = guess - offset * 60000;
  }
  return new Date(instant);
}

/** Chicago calendar date ("YYYY-MM-DD") of an instant. */
export function chicagoDateOf(instant: Date): string {
  const p = zonedParts(instant);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday for a calendar date. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatChicago(instant: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, ...options }).format(instant);
}

/** "19:00" → "7:00 PM" */
export function displayTime(time: string | null | undefined) {
  if (!time || !isValidTimeString(time)) return time ?? "";
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Parses "9:00 AM", "9am", "21:15" into minutes after midnight, or null. */
export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const twelve = /^\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?\s*[Mm]?\.?\s*$/.exec(value);
  if (twelve) {
    const hour = Number(twelve[1]);
    const minute = Number(twelve[2] ?? "0");
    if (hour < 1 || hour > 12 || minute > 59) return null;
    return ((hour % 12) + (twelve[3].toLowerCase() === "p" ? 12 : 0)) * 60 + minute;
  }
  const iso = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(value);
  if (iso) {
    const hour = Number(iso[1]);
    const minute = Number(iso[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }
  return null;
}

export function minutesToDisplay(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return displayTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}
