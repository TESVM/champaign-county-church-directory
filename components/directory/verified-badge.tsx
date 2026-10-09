import { BadgeCheck, SearchCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Distinguishes "checked against a public source" from "confirmed by church
 * leadership". A bare "Verified" label implied the church had confirmed details
 * it never saw.
 */
export function VerifiedBadge({
  verified,
  claimed,
  leadershipConfirmedAt,
  publicSourceCheckedAt
}: {
  verified: boolean;
  claimed: boolean;
  leadershipConfirmedAt?: string;
  publicSourceCheckedAt?: string;
}) {
  const leadership = Boolean(leadershipConfirmedAt);
  const sourceChecked = !leadership && (Boolean(publicSourceCheckedAt) || verified);
  return (
    <div className="flex flex-wrap gap-2">
      {leadership ? (
        <Badge className="bg-emerald-100 text-emerald-900" title="Details confirmed by the church's own leadership">
          <BadgeCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Confirmed by church
        </Badge>
      ) : null}
      {sourceChecked ? (
        <Badge className="bg-sage/15 text-[#3f5f45]" title="Checked against the church's website or another public source">
          <SearchCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Source checked
        </Badge>
      ) : null}
      {claimed ? (
        <Badge className="bg-sky text-brand-900" title="Church staff manage this listing">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Church-managed
        </Badge>
      ) : null}
    </div>
  );
}
