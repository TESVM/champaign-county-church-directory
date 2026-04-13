import { Clock3 } from "lucide-react";
import { ChurchRecord } from "@/lib/types";

export function ServiceTimesList({ items }: { items: ChurchRecord["serviceTimes"] }) {
  return (
    <div className="space-y-3">
      {items.map((service) => (
        <div key={`${service.serviceName}-${service.dayOfWeek}-${service.startTime}`} className="flex gap-3 rounded-2xl bg-brand-50 px-4 py-3">
          <Clock3 className="mt-0.5 h-4 w-4 text-brand-700" />
          <div>
            <p className="font-semibold text-ink">{service.serviceName}</p>
            <p className="text-sm text-stone-600">
              {service.dayOfWeek} at {service.startTime}
              {service.endTime ? ` to ${service.endTime}` : ""}
            </p>
            {service.notes ? <p className="text-sm text-stone-500">{service.notes}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
