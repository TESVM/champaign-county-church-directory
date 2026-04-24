import Image from "next/image";
import { notFound } from "next/navigation";
import { saveChurchListingAction, saveChurchMediaAction, saveChurchStatusAction } from "@/app/actions";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ChurchMediaForm } from "@/components/forms/church-media-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { requireAdminAccess } from "@/lib/auth-guards";
import { getChurchBySlug } from "@/lib/data/queries";
import { getPersistedChurchMediaBySlug, hasDatabaseUrl } from "@/lib/data/admin-store";
import { isInlineImageUrl } from "@/lib/utils";

export default async function AdminChurchEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminAccess();

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const savedState = Array.isArray(resolvedSearchParams.saved) ? resolvedSearchParams.saved[0] : resolvedSearchParams.saved;
  const canPersistChanges = hasDatabaseUrl();
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
  const unoptimizedPreviewImage = isInlineImageUrl(previewImage);

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
            {savedState ? (
              <div className="mt-5 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-900 ring-1 ring-brand-100">
                {savedState === "media" && "Church image saved."}
                {savedState === "record" && "Church details saved."}
                {savedState === "verified" && "Church marked verified."}
                {savedState === "claimed" && "Church marked claimed."}
                {savedState === "needs-db" && "This site needs DATABASE_URL in Vercel before church photos and profile edits can persist."}
              </div>
            ) : null}
            {!canPersistChanges ? (
              <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                Persistent church edits are currently disabled because `DATABASE_URL` is not configured for this deployment.
              </div>
            ) : null}
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <div className="relative h-72 overflow-hidden rounded-[28px] border border-white/70 bg-white">
                  <Image src={previewImage} alt={church.name} fill className="object-cover" unoptimized={unoptimizedPreviewImage} />
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
                  returnPath={`/admin/churches/${church.slug}`}
                  featuredImageUrl={featuredImageUrl}
                  logoUrl={logoUrl}
                  submitLabel="Save images"
                />

                <form action={saveChurchListingAction} className="grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="churchSlug" value={church.slug} />
                  <input type="hidden" name="returnPath" value={`/admin/churches/${church.slug}`} />
                  <Input name="name" defaultValue={church.name} aria-label="Church name" />
                  <Input name="city" defaultValue={church.city} aria-label="City" />
                  <Input name="pastorFullName" defaultValue={church.pastor.fullName} aria-label="Senior pastor" />
                  <Input name="denomination" defaultValue={church.denomination} aria-label="Denomination" />
                  <Input name="websiteUrl" defaultValue={church.websiteUrl} aria-label="Website URL" />
                  <Input name="appUrl" defaultValue={church.appUrl} aria-label="App URL" />
                  <Input name="phone" defaultValue={church.phone} aria-label="Phone" />
                  <Input name="email" defaultValue={church.email} aria-label="Email" />
                  <Input name="livestreamUrl" defaultValue={church.livestreamUrl} aria-label="Livestream URL" className="md:col-span-2" />
                  <div className="md:col-span-2">
                    <Textarea name="description" defaultValue={church.description} aria-label="Description" />
                  </div>
                  <div className="md:col-span-2 flex gap-3">
                    <Button type="submit" variant="secondary">Save full record</Button>
                  </div>
                </form>
                <div className="flex gap-3">
                  <form action={saveChurchStatusAction}>
                    <input type="hidden" name="churchSlug" value={church.slug} />
                    <input type="hidden" name="returnPath" value={`/admin/churches/${church.slug}`} />
                    <input type="hidden" name="field" value="verified" />
                    <Button type="submit" variant="secondary">Mark verified</Button>
                  </form>
                  <form action={saveChurchStatusAction}>
                    <input type="hidden" name="churchSlug" value={church.slug} />
                    <input type="hidden" name="returnPath" value={`/admin/churches/${church.slug}`} />
                    <input type="hidden" name="field" value="claimed" />
                    <Button type="submit" variant="secondary">Mark claimed</Button>
                  </form>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
