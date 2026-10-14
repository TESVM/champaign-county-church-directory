import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { shouldOptimizeImage } from "@/lib/images";

/** `tone="dark"` is for use on dark backgrounds, such as the homepage spotlight. */
export function PastorBadge({ name, title, photoUrl, tone = "light" }: { name: string; title?: string | null; photoUrl?: string | null; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  if (!name?.trim()) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {photoUrl ? (
        <span className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full border bg-brand-50 ${dark ? "border-white/60" : "border-line"}`}>
          <Image src={photoUrl} alt={`Photo of ${name}`} fill sizes="56px" className="object-cover" unoptimized={!shouldOptimizeImage(photoUrl)} />
        </span>
      ) : null}
      {title ? <Badge className={dark ? "bg-white/15 text-white ring-1 ring-white/30" : "bg-sage/15 text-[#3f5f45]"}>{title}</Badge> : null}
      <p className={`text-lg font-semibold ${dark ? "text-white" : "text-ink"}`}>{name}</p>
    </div>
  );
}
