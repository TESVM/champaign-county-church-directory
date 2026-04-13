import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function CityCard({
  name,
  slug,
  description,
  churchCount
}: {
  name: string;
  slug: string;
  description: string;
  churchCount: number;
}) {
  return (
    <Card className="relative flex h-full flex-col justify-between overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-brand-300/45 via-sky/70 to-sage/35" />
      <div>
        <p className="relative text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">{churchCount} churches</p>
        <h3 className="relative mt-3 font-display text-2xl">{name}</h3>
        <p className="mt-3 text-sm leading-7 text-stone-600">{description}</p>
      </div>
      <Link href={`/cities/${slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-900">
        Browse {name}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}
