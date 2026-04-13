import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Card } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/auth-guards";
import { formatDate } from "@/lib/utils";
import { getSubmissions } from "@/lib/data/queries";

export default async function AdminSubmissionsPage() {
  await requireAdminAccess();

  const submissions = getSubmissions();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="admin-shell rounded-[36px] border border-white/70 p-5 sm:p-8">
          <div className="section-strong rounded-[30px] border border-white/70 px-6 py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Submissions</p>
            <h1 className="mt-4 font-display text-5xl">Public forms waiting for review</h1>
          </div>
          <div className="mt-8 space-y-4">
            {submissions.map((submission) => (
              <Card key={submission.id} className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-display text-2xl">{submission.churchName}</h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {submission.type} from {submission.contactName} • {submission.contactEmail}
                    </p>
                  </div>
                  <p className="text-sm text-stone-500">{formatDate(submission.createdAt)}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
