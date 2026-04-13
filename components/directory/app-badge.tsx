import { Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AppBadge() {
  return (
    <Badge className="bg-sky text-brand-900">
      <Smartphone className="mr-1 h-3.5 w-3.5" />
      App Available
    </Badge>
  );
}
