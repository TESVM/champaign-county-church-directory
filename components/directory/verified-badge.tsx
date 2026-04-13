import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function VerifiedBadge({ verified, claimed }: { verified: boolean; claimed: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {verified ? (
        <Badge className="bg-sage/15 text-sage">
          <BadgeCheck className="mr-1 h-3.5 w-3.5" />
          Verified
        </Badge>
      ) : null}
      {claimed ? (
        <Badge className="bg-sky text-brand-900">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          Claimed
        </Badge>
      ) : null}
    </div>
  );
}
