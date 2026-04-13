import Link from "next/link";
import { ChurchMembershipRecord } from "@/lib/types";

export function ChurchDashboardSidebar({
  memberships,
  canAccessAdmin
}: {
  memberships: ChurchMembershipRecord[];
  canAccessAdmin: boolean;
}) {
  return (
    <aside className="overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-6 text-white shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky">Church Login</p>
      <h2 className="mt-3 font-display text-3xl">Managed listings</h2>
      <p className="mt-3 max-w-xs text-sm leading-6 text-white/80">
        Owners can publish trusted updates. Editors prepare changes and route them into review.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Link href="/dashboard" className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/16">
          Overview
        </Link>
        {memberships.map((membership) => (
          <Link
            key={membership.id}
            href={`/dashboard/churches/${membership.churchSlug}`}
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/16"
          >
            {membership.churchName}
          </Link>
        ))}
        {canAccessAdmin ? (
          <Link href="/admin" className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-black/25">
            Open admin back office
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
