import Link from "next/link";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Card } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/auth-guards";
import { churches } from "@/lib/data/queries";

export default async function AdminChurchesPage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="admin-shell rounded-[36px] border border-white/70 p-5 sm:p-8">
          <div className="section-strong rounded-[30px] border border-white/70 px-6 py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Church Management</p>
            <h1 className="mt-4 font-display text-5xl">Manage church records</h1>
            <p className="mt-4 max-w-2xl text-lg text-stone-600">Edit listing details, confirm leadership information, and keep digital links current across the public directory.</p>
          </div>
          <div className="mt-8 space-y-4">
            {churches.map((church) => (
              <Card key={church.id} className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-display text-2xl">{church.name}</h2>
                    <p className="mt-1 text-sm text-stone-600">{church.city} • {church.pastor.fullName}</p>
                  </div>
                  <Link href={`/admin/churches/${church.slug}`} className="text-sm font-semibold text-brand-900">
                    Edit record
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
