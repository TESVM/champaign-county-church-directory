import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Card } from "@/components/ui/card";
import { requireAdminAccess } from "@/lib/auth-guards";
import { getPersistedAdminUsers } from "@/lib/data/admin-store";

export default async function AdminUsersPage() {
  await requireAdminAccess();

  const users = await getPersistedAdminUsers();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="space-y-6 admin-shell rounded-[36px] border border-white/70 p-5 sm:p-8">
          <div className="section-strong rounded-[30px] border border-white/70 px-6 py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Users</p>
            <h1 className="mt-4 font-display text-5xl">Directory admins and church managers</h1>
            <p className="mt-4 text-lg text-stone-600">
              Keep site-level roles separate from church-level memberships so church staff can edit listings without receiving full back-office access.
            </p>
          </div>
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id} className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-display text-2xl">{user.name}</h2>
                    <p className="mt-1 text-sm text-stone-600">{user.email}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                      {user.role.replaceAll("_", " ")} • {user.status}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Managed churches</p>
                    <p className="mt-2 text-sm text-stone-600">
                      {user.churchSlugs.length ? user.churchSlugs.join(", ") : "Site-level access only"}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
