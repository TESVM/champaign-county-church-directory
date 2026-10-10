import { Clock3 } from "lucide-react";
import type { ChurchDetail } from "@cccd/shared";

const DAY_LABEL: Record<string, string> = {
  SUNDAY: "Sunday",
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday"
};

export function ServiceTimesList({ items }: { items: ChurchDetail["serviceTimes"] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-stone-600">
        Service times are not listed yet. Contact the church to confirm.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((service) => (
        <div key={service.id} className="flex gap-3 rounded-2xl bg-brand-50 px-4 py-3">
          <Clock3 className="mt-0.5 h-4 w-4 text-brand-700" aria-hidden="true" />
          <div>
            <p className="font-semibold text-ink">{service.serviceName}</p>
            <p className="text-sm text-stone-600">
              {DAY_LABEL[service.dayOfWeek] ?? service.dayOfWeek} at {service.displayTime}
            </p>
            {service.notes ? <p className="text-sm text-stone-500">{service.notes}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
