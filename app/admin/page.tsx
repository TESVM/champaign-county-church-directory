import Link from "next/link";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ChurchCard } from "@/components/directory/church-card";
import { Card } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/auth-guards";
import {
  getAuditLogs,
  getFeaturedChurches,
  getSuggestedChanges,
  getSubmissions,
} from "@/lib/data/queries";
import {
  getPersistedAdminStats,
  getPersistedClaimRequests,
  getPersistedListingsNeedingRefresh,
  getPersistedUnclaimedChurches
} from "@/lib/data/admin-store";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  await requireAdminAccess();

  const stats = await getPersistedAdminStats();
  const changes = getSuggestedChanges();
  const submissions = getSubmissions();
  const sampleChurches = getFeaturedChurches();
  const pendingClaims = (await getPersistedClaimRequests()).slice(0, 3);
  const unclaimed = (await getPersistedUnclaimedChurches()).slice(0, 4);
  const stale = (await getPersistedListingsNeedingRefresh()).slice(0, 4);
  const logs = getAuditLogs().slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="space-y-8 admin-shell rounded-[36px] border border-white/70 p-5 sm:p-8">
          <div className="section-strong rounded-[30px] border border-white/70 px-6 py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Admin Dashboard</p>
            <h1 className="mt-4 font-display text-5xl">Review activity and manage directory records</h1>
            <p className="mt-4 max-w-2xl text-lg text-stone-600">A polished workspace for reviewing submissions, suggested changes, and church records with the same visual language as the public site.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              ["Churches", stats.churches],
              ["Verified", stats.verified],
              ["Claimed", stats.claimed],
              ["Pending changes", stats.pendingChanges],
              ["Pending claims", stats.pendingClaims]
            ].map(([label, value]) => (
              <Card key={label} className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">{label}</p>
                <p className="mt-3 font-display text-4xl text-ink">{value}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-white/70 bg-gradient-to-br from-white via-sky/30 to-brand-50 p-6">
              <h2 className="font-display text-2xl">Pending review queue</h2>
              <div className="mt-4 space-y-4">
                {changes.map((change) => (
                  <div key={change.id} className="rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                    <p className="font-semibold text-ink">{change.churchName}</p>
                    <p className="mt-1 text-sm text-stone-600">{change.fieldName}: {change.oldValue} → {change.newValue}</p>
                  </div>
                ))}
              </div>
              <Link href="/admin/review" className="mt-5 inline-block text-sm font-semibold text-brand-900">Open review queue</Link>
            </Card>
            <Card className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-rose/10 p-6">
              <h2 className="font-display text-2xl">Claim requests</h2>
              <div className="mt-4 space-y-4">
                {pendingClaims.map((claim) => (
                  <div key={claim.id} className="rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                    <p className="font-semibold text-ink">{claim.churchName}</p>
                    <p className="mt-1 text-sm text-stone-600">{claim.verificationMethod.replaceAll("_", " ")} from {claim.applicantName}</p>
                  </div>
                ))}
              </div>
              <Link href="/admin/claims" className="mt-5 inline-block text-sm font-semibold text-brand-900">Review claims</Link>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-6">
              <h2 className="font-display text-2xl">Public submissions</h2>
              <div className="mt-4 space-y-4">
                {submissions.slice(0, 3).map((submission) => (
                  <div key={submission.id} className="rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                    <p className="font-semibold text-ink">{submission.churchName}</p>
                    <p className="mt-1 text-sm text-stone-600">{submission.type} from {submission.contactName}</p>
                  </div>
                ))}
              </div>
              <Link href="/admin/submissions" className="mt-5 inline-block text-sm font-semibold text-brand-900">View submissions</Link>
            </Card>
            <Card className="border-white/70 bg-gradient-to-br from-white via-sky/30 to-brand-50 p-6">
              <h2 className="font-display text-2xl">Needs refresh</h2>
              <div className="mt-4 space-y-4">
                {stale.map((church) => (
                  <div key={church.id} className="rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                    <p className="font-semibold text-ink">{church.name}</p>
                    <p className="mt-1 text-sm text-stone-600">Last updated {formatDate(church.lastUpdatedAt)}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-rose/10 p-6">
              <h2 className="font-display text-2xl">Unclaimed churches</h2>
              <div className="mt-4 space-y-4">
                {unclaimed.map((church) => (
                  <div key={church.id} className="rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                    <p className="font-semibold text-ink">{church.name}</p>
                    <p className="mt-1 text-sm text-stone-600">{church.city}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/20 p-6">
            <h2 className="font-display text-2xl">Recent admin activity</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                  <p className="font-semibold text-ink">{log.action}</p>
                  <p className="mt-1 text-sm text-stone-600">{log.target}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-brand-700">{log.actor} • {formatDate(log.createdAt)}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {sampleChurches.map((church) => (
              <ChurchCard key={church.id} church={church} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
