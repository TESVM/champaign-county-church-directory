import type { CampusEventView } from "@/components/campus/event-list";
import type { CampusOccurrence } from "@/lib/services/campus";
import { displayTime, formatChicago } from "@/lib/time/chicago";

export function toEventView(o: CampusOccurrence): CampusEventView {
  return {
    key: o.key,
    icsUrl: o.icsUrl,
    title: o.title,
    description: o.description,
    location: o.location,
    registrationUrl: o.registrationUrl,
    dateLabel: formatChicago(o.startsAt, { weekday: "short", month: "short", day: "numeric" }),
    timeLabel: o.startTime ? displayTime(o.startTime) : null,
    weekly: o.weekly,
    categories: o.categories,
    campuses: o.campuses,
    host: o.host
  };
}
