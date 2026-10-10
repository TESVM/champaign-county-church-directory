import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireStaff } from "@/lib/auth-guards";
import { adminQueueCounts } from "@/lib/services/admin-stats";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await requireStaff("/admin");
  const counts = await adminQueueCounts();
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
      <AdminSidebar counts={counts} isAdmin={actor.staffRole === "ADMIN"} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
