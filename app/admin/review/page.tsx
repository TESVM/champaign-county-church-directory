import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ReviewComparisonCard } from "@/components/admin/review-comparison-card";
import { requireAdminAccess } from "@/lib/auth-guards";
import { getSuggestedChanges } from "@/lib/data/queries";

export default async function AdminReviewPage() {
  await requireAdminAccess();

  const changes = getSuggestedChanges();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="space-y-6 admin-shell rounded-[36px] border border-white/70 p-5 sm:p-8">
          <div className="section-strong rounded-[30px] border border-white/70 px-6 py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Review Queue</p>
            <h1 className="mt-4 font-display text-5xl">Approve or reject suggested updates</h1>
            <p className="mt-4 text-lg text-stone-600">Changes from weekly scans and public submissions are staged here for manual review.</p>
          </div>
          {changes.map((change) => (
            <ReviewComparisonCard key={change.id} change={change} />
          ))}
        </div>
      </div>
    </div>
  );
}
