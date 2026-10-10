import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { ChurchPhotoPlaceholder } from "@/components/directory/church-card";
import { studentTagLabel } from "@/lib/campus";
import { shouldOptimizeImage } from "@/lib/images";
import type { StudentChurch } from "@/lib/services/campus";
import { nextService } from "@/lib/time/next-service";

const miles = (m: number | null) => (m == null ? null : m < 0.1 ? "<0.1 mi" : `${m.toFixed(1)} mi`);

export function StudentChurchCard({ item, campus = "uiuc" }: { item: StudentChurch; campus?: "uiuc" | "parkland" }) {
  const { church } = item;
  const image = church.featuredImageUrl ?? church.logoUrl;
  const next = nextService(church.serviceDetails ?? []);
  const distance = campus === "parkland" ? miles(item.milesFromParkland) : miles(item.milesFromUiuc);
  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-[24px] border bg-white shadow-card ${church.featured ? "border-amber-300" : "border-line"}`}>
      <div className="relative h-36">
        {image ? (
          <Image src={image} alt={church.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" unoptimized={!shouldOptimizeImage(image)} />
        ) : (
          <ChurchPhotoPlaceholder citySlug={church.citySlug} />
        )}
        {church.featured ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-amber-800">
            <Star className="h-3.5 w-3.5" aria-hidden="true" /> Featured
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl leading-tight text-ink">
          <Link href={`/churches/${church.slug}`} className="focus-ring hover:text-brand-700">
            {church.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-stone-600">
          {church.city}
          {church.denomination ? ` · ${church.denomination}` : ""}
          {distance ? ` · ${distance} from ${campus === "parkland" ? "Parkland" : "the Illini Union"}` : ""}
        </p>
        <p className="mt-2 text-sm font-medium text-stone-800">{next ? `Next service: ${next.label}` : "Service times not listed yet"}</p>
        {item.tags.length ? (
          <div className="mt-3">
            <ul className="flex flex-wrap gap-1.5">
              {item.tags.map((t) => (
                <li key={t} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900">
                  {studentTagLabel(t)}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-stone-500">{item.tagSource === "church" ? "Confirmed by the church" : "From the church’s public website; not yet confirmed by the church"}</p>
          </div>
        ) : null}
        {item.studentMinistries.length ? (
          <p className="mt-3 text-sm text-stone-700">
            <span className="font-medium">Listed ministries:</span> {item.studentMinistries.join(", ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
