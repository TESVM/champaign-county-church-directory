import { addDays, chicagoDateOf, chicagoToUtc, minutesToDisplay, weekdayOf } from "@/lib/time/chicago";

const DAY_INDEX: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type NextService = { at: Date; label: string; serviceName: string };

/**
 * The next listed service after `now`, in America/Chicago. Services without a
 * parseable start time are skipped rather than guessed.
 */
export function nextService(
  services: Array<{ dayOfWeek: string; startMinutes?: number | null; serviceName: string }>,
  now = new Date()
): NextService | null {
  const today = chicagoDateOf(now);
  const todayIndex = weekdayOf(today);
  let best: NextService | null = null;
  for (const s of services) {
    const day = DAY_INDEX[s.dayOfWeek.trim().toLowerCase()];
    if (day === undefined || s.startMinutes == null) continue;
    for (const weekOffset of [0, 7]) {
      const date = addDays(today, ((day - todayIndex + 7) % 7) + weekOffset);
      const hh = String(Math.floor(s.startMinutes / 60)).padStart(2, "0");
      const mm = String(s.startMinutes % 60).padStart(2, "0");
      const at = chicagoToUtc(date, `${hh}:${mm}`);
      if (at.getTime() <= now.getTime()) continue;
      const days = Math.round((Date.UTC(...(date.split("-").map(Number) as [number, number, number])) - Date.UTC(...(today.split("-").map(Number) as [number, number, number]))) / 86400000);
      const when = days === 0 ? "Today" : days === 1 ? "Tomorrow" : SHORT[day];
      const candidate = { at, label: `${when} ${minutesToDisplay(s.startMinutes)}`, serviceName: s.serviceName };
      if (!best || at < best.at) best = candidate;
      break;
    }
  }
  return best;
}
