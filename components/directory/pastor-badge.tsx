import { Badge } from "@/components/ui/badge";

export function PastorBadge({ name, title }: { name: string; title?: string | null }) {
  if (!name?.trim()) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {title ? <Badge className="bg-sage/15 text-[#3f5f45]">{title}</Badge> : null}
      <p className="text-lg font-semibold text-ink">{name}</p>
    </div>
  );
}
