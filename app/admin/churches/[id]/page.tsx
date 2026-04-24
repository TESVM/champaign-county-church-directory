import Image from "next/image";
import { notFound } from "next/navigation";
import { saveChurchMediaAction } from "@/app/actions";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ChurchMediaForm } from "@/components/forms/church-media-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { requireAdminAccess } from "@/lib/auth-guards";
import { getChurchBySlug } from "@/lib/data/queries";
import { getPersistedChurchMediaBySlug } from "@/lib/data/admin-store";

export default async function AdminChurchEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAccess();

  const { id } = await params;
  const church = getChurchBySlug(id);

  if (!church) {
    notFound();
  }

  const persistedMedia = await getPersistedChurchMediaBySlug(id);
  const featuredImageUrl = persistedMedia?.featuredImageUrl ?? church.featuredImageUrl ?? "";
  const logoUrl = persistedMedia?.logoUrl ?? church.logoUrl ?? "";
  const previewImage =
    featuredImageUrl ||
    logoUrl ||
    "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=1200&q=80";

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
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <div className="relative h-72 overflow-hidden rounded-[28px] border border-white/70 bg-white">
                  <Image src={previewImage} alt={church.name} fill className="object-cover" />
                </div>
                <div className="rounded-[24px] bg-white/85 p-5 ring-1 ring-brand-100">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Current image</p>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    Add a direct image URL from the church website, Facebook page, CDN, or another stable hosted image to replace the generic fallback photo.
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <ChurchMediaForm
                  action={saveChurchMediaAction}
                  churchSlug={church.slug}
                  featuredImageUrl={featuredImageUrl}
                  logoUrl={logoUrl}
                  submitLabel="Save images"
                />

                <div className="grid gap-4 md:grid-cols-2">
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
                    <Button type="button" variant="secondary">Save full record later</Button>
                    <Button type="button" variant="secondary">Mark verified</Button>
                    <Button type="button" variant="secondary">Mark claimed</Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
