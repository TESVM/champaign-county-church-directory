import Image from "next/image";
import { removeChurchPhotoAction, saveChurchPhotoAction } from "@/app/actions";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextAreaField, TextField } from "@/components/ui/field";
import { loadManagedChurch } from "@/lib/dashboard";
import { shouldOptimizeImage } from "@/lib/images";
import { uploadsUnavailableReason } from "@/lib/media";

export default async function PhotoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, row, canManage } = await loadManagedChurch(slug, "/photo");
  const uploadBlocked = uploadsUnavailableReason();
  return (
    <>
      <ChurchTabs slug={slug} current="/photo" canManage={canManage} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <h2 className="font-display text-2xl">Current photo</h2>
          <div className="relative mt-4 aspect-[3/2] overflow-hidden rounded-2xl bg-brand-50">
            {church.featuredImageUrl ? (
              <Image src={church.featuredImageUrl} alt={`Current photo of ${church.name}`} fill sizes="400px" className="object-cover" unoptimized={!shouldOptimizeImage(church.featuredImageUrl)} />
            ) : (
              <p className="flex h-full items-center justify-center p-6 text-center text-sm text-stone-600">No photo yet. Visitors see a neutral placeholder.</p>
            )}
          </div>
          {church.featuredImageUrl ? (
            <dl className="mt-4 space-y-1 text-sm text-stone-700">
              <div><dt className="inline font-semibold">Credit: </dt><dd className="inline">{church.featuredImageCredit ?? "Not recorded"}</dd></div>
              <div><dt className="inline font-semibold">Permission: </dt><dd className="inline">{row.featuredImagePermission ?? "Not recorded"}</dd></div>
            </dl>
          ) : null}
          {row.featuredImageIsAi ? <p className="mt-3 text-sm text-amber-900">An AI-generated image is stored for this church but is not shown publicly.</p> : null}
          {church.featuredImageUrl ? (
            <div className="mt-4">
              <ActionForm action={removeChurchPhotoAction}>
                <input type="hidden" name="churchId" value={church.id} />
                <SubmitButton variant="secondary" pendingLabel="Removing…">Remove photo</SubmitButton>
              </ActionForm>
            </div>
          ) : null}
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-2xl">Replace photo</h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            Use a real photo of your building, sanctuary, or congregation that you took or have permission to use. Stock photos and AI images are not accepted.
          </p>
          <div className="mt-4">
            <ActionForm action={saveChurchPhotoAction} fieldLabels={{ imageUrl: "Image link", file: "Photo file", credit: "Credit", permission: "Permission" }}>
              <input type="hidden" name="churchId" value={church.id} />
              {uploadBlocked ? (
                <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-950">{uploadBlocked}</p>
              ) : (
                <label className="block text-sm">
                  <span className="font-medium text-stone-700">Upload a photo (JPEG, PNG, or WebP, up to 4 MB)</span>
                  <input id="field-file" type="file" name="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm file:mr-4 file:min-h-[44px] file:rounded-full file:border-0 file:bg-brand-900 file:px-4 file:text-white" />
                </label>
              )}
              <TextField name="imageUrl" label={uploadBlocked ? "Image link (https)" : "…or paste an image link (https)"} type="url" />
              <TextField name="credit" label="Who took or published it?" required placeholder="Our church / photographer name" />
              <TextAreaField name="permission" label="Why we may use it" required hint="For example: “Taken by our staff”, or “Published on our own website”." />
              <TextField name="sourceUrl" label="Where it is published (optional)" type="url" />
              <SubmitButton pendingLabel="Uploading…">Save photo</SubmitButton>
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
