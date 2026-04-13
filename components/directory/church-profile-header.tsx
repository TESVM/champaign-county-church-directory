import { PastorBadge } from "@/components/directory/pastor-badge";
import { VerifiedBadge } from "@/components/directory/verified-badge";
import { ChurchRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ChurchProfileHeader({ church }: { church: ChurchRecord }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">{church.city}, Illinois</p>
      <h1 className="mt-4 font-display text-5xl">{church.name}</h1>
      <div className="mt-4 flex flex-wrap gap-3">
        <VerifiedBadge verified={church.verified} claimed={church.claimed} />
        <p className="text-sm text-stone-500">Last updated {formatDate(church.lastUpdatedAt)}</p>
      </div>
      <div className="mt-6">
        <PastorBadge name={church.pastor.fullName} title={church.pastor.title} />
      </div>
    </div>
  );
}
