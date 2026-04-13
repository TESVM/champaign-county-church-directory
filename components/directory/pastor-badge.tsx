import { Badge } from "@/components/ui/badge";

export function PastorBadge({ name, title }: { name: string; title: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge className="bg-sage/15 text-sage">{title}</Badge>
      <p className="text-lg font-semibold text-ink">{name}</p>
    </div>
  );
}
