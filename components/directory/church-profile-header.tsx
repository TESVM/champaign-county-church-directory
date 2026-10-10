import type { ChurchDetail } from "@cccd/shared";
import { PastorBadge } from "@/components/directory/pastor-badge";
import { VerifiedBadge } from "@/components/directory/verified-badge";
import { formatDate } from "@/lib/utils";

export function ChurchProfileHeader({ church }: { church: ChurchDetail }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
        {church.city.name}, Illinois
      </p>
      <h1 className="mt-4 font-display text-4xl sm:text-5xl">{church.name}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <VerifiedBadge verified={church.verified} claimed={church.claimed} />
        {church.lastUpdatedAt ? (
          <p className="text-sm text-stone-600">
            Last updated {formatDate(church.lastUpdatedAt)}
          </p>
        ) : null}
      </div>
      {church.seniorPastor ? (
        <div className="mt-6">
          <PastorBadge
            name={church.seniorPastor.fullName}
            title={church.seniorPastor.title}
          />
        </div>
      ) : null}
    </div>
  );
}
