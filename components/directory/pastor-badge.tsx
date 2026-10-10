import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { shouldOptimizeImage } from "@/lib/images";

export function PastorBadge({ name, title, photoUrl }: { name: string; title?: string | null; photoUrl?: string | null }) {
  if (!name?.trim()) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {photoUrl ? (
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-line bg-brand-50">
          <Image src={photoUrl} alt={`Photo of ${name}`} fill sizes="56px" className="object-cover" unoptimized={!shouldOptimizeImage(photoUrl)} />
        </span>
      ) : null}
      {title ? <Badge className="bg-sage/15 text-[#3f5f45]">{title}</Badge> : null}
      <p className="text-lg font-semibold text-ink">{name}</p>
    </div>
  );
}
