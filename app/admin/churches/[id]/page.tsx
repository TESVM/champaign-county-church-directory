import { notFound } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { requireAdminAccess } from "@/lib/auth-guards";
import { getChurchBySlug } from "@/lib/data/queries";

export default async function AdminChurchEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAccess();

  const { id } = await params;
  const church = getChurchBySlug(id);

  if (!church) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="admin-shell rounded-[36px] border border-white/70 p-5 sm:p-8">
          <Card className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/40 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Edit Church</p>
            <h1 className="mt-4 font-display text-4xl">{church.name}</h1>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-brand-900 px-4 py-2 text-sm font-semibold text-white">{church.city}</span>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-stone-700 ring-1 ring-brand-100">{church.pastor.fullName}</span>
            </div>
            <form className="mt-8 grid gap-4 md:grid-cols-2">
              <Input defaultValue={church.name} aria-label="Church name" />
              <Input defaultValue={church.city} aria-label="City" />
              <Input defaultValue={church.pastor.fullName} aria-label="Senior pastor" />
              <Input defaultValue={church.denomination} aria-label="Denomination" />
              <Input defaultValue={church.websiteUrl} aria-label="Website URL" />
              <Input defaultValue={church.appUrl} aria-label="App URL" />
              <Input defaultValue={church.phone} aria-label="Phone" />
              <Input defaultValue={church.email} aria-label="Email" />
              <div className="md:col-span-2">
                <Textarea defaultValue={church.description} aria-label="Description" />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="button">Save changes</Button>
                <Button type="button" variant="secondary">Mark verified</Button>
                <Button type="button" variant="secondary">Mark claimed</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
