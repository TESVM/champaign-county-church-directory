import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { saveSiteContentAction } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { requireAdminAccess } from "@/lib/auth-guards";
import { getPersistedSiteContent } from "@/lib/data/admin-store";
import { formatDate } from "@/lib/utils";

export default async function AdminContentPage() {
  await requireAdminAccess();

  const content = await getPersistedSiteContent();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="space-y-6 admin-shell rounded-[36px] border border-white/70 p-5 sm:p-8">
          <div className="section-strong rounded-[30px] border border-white/70 px-6 py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">Content</p>
            <h1 className="mt-4 font-display text-5xl">Edit high-visibility site copy without code changes</h1>
            <p className="mt-4 text-lg text-stone-600">
              Homepage messaging, announcement banners, directory helper text, and other lightweight editorial surfaces belong here.
            </p>
          </div>
          {content.map((item) => (
            <Card key={item.id} className="border-white/70 bg-gradient-to-br from-white via-brand-50 to-sky/30 p-6">
              <form action={saveSiteContentAction} className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <input type="hidden" name="key" value={item.key} />
                <input type="hidden" name="label" value={item.label} />
                <input type="hidden" name="area" value={item.area} />
                <div className="w-full">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">{item.area}</p>
                  <h2 className="mt-3 font-display text-2xl">{item.label}</h2>
                  <div className="mt-4">
                    {item.value.length > 120 ? (
                      <Textarea name="value" defaultValue={item.value} aria-label={item.label} />
                    ) : (
                      <Input name="value" defaultValue={item.value} aria-label={item.label} />
                    )}
                  </div>
                </div>
                <div className="min-w-[180px] rounded-2xl bg-white/80 p-4 ring-1 ring-brand-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Last updated</p>
                  <p className="mt-2 text-sm text-stone-600">{formatDate(item.updatedAt)}</p>
                  <Button type="submit" className="mt-4 w-full">Save draft</Button>
                </div>
              </form>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
