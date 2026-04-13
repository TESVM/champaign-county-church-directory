import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChurchRecord } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export function RecentlyUpdated({ churches }: { churches: ChurchRecord[] }) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {churches.map((church) => (
        <Card key={church.id} className="border-white/60 bg-gradient-to-br from-white to-brand-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Updated {formatDate(church.lastUpdatedAt)}</p>
          <h3 className="mt-3 font-display text-2xl">{church.name}</h3>
          <p className="mt-2 text-sm text-stone-600">
            {church.city} • {church.pastor.fullName}
          </p>
          <p className="mt-4 text-sm leading-7 text-stone-600">{church.shortDescription}</p>
          <Link href={`/churches/${church.slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-900">
            Review listing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      ))}
    </section>
  );
}
