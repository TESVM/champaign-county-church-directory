import Image from "next/image";
import Link from "next/link";
import { addGalleryPhotoAction, removeChurchPhotoAction, removeGalleryPhotoAction, removePastorPhotoAction, saveChurchPhotoAction, savePastorPhotoAction } from "@/app/actions";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { PhotoFileInput } from "@/components/dashboard/photo-file-input";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { TextAreaField, TextField } from "@/components/ui/field";
import { loadManagedChurch } from "@/lib/dashboard";
import { shouldOptimizeImage } from "@/lib/images";
import { uploadsUnavailableReason } from "@/lib/media";
import { MAX_GALLERY_PHOTOS, UPLOAD_REQUIRES_ENHANCED, canUploadPhotos, listGalleryPhotos } from "@/lib/services/media";

function UploadNotice({ reason, slug, canManage }: { reason: string; slug: string; canManage: boolean }) {
  return (
    <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-950">
      {reason}{" "}
      {reason === UPLOAD_REQUIRES_ENHANCED && canManage ? (
        <Link href={`/dashboard/churches/${slug}/billing`} className="font-semibold underline">
          See the Enhanced Church Profile
        </Link>
      ) : null}
    </p>
  );
}

export default async function PhotoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, row, actor, canManage } = await loadManagedChurch(slug, "/photo");
  const storageProblem = uploadsUnavailableReason();
  const allowed = await canUploadPhotos(actor, church.id);
  // Why the upload box is hidden, if it is. Storage problems take priority.
  const uploadBlocked = storageProblem ?? (allowed ? null : UPLOAD_REQUIRES_ENHANCED);
  const pastor = row.seniorPastor;
  const gallery = await listGalleryPhotos(church.id);

  return (
    <>
      <ChurchTabs slug={slug} current="/photo" canManage={canManage} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <h2 className="font-display text-2xl">Current church photo</h2>
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
          <h2 className="font-display text-2xl">Replace church photo</h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            Use a real photo of your building, sanctuary, or congregation that you took or have permission to use. Stock photos and AI images are not accepted.
          </p>
          <div className="mt-4">
            <ActionForm action={saveChurchPhotoAction} fieldLabels={{ imageUrl: "Image link", file: "Photo file", credit: "Credit", permission: "Permission" }}>
              <input type="hidden" name="churchId" value={church.id} />
              {uploadBlocked ? <UploadNotice reason={uploadBlocked} slug={slug} canManage={canManage} /> : <PhotoFileInput />}
              <TextField name="imageUrl" label={uploadBlocked ? "Image link (https)" : "…or paste an image link (https)"} type="url" />
              <TextField name="credit" label="Who took or published it?" required placeholder="Our church / photographer name" />
              <TextAreaField name="permission" label="Why we may use it" required hint="For example: “Taken by our staff”, or “Published on our own website”." />
              <TextField name="sourceUrl" label="Where it is published (optional)" type="url" />
              <SubmitButton pendingLabel="Saving…">Save photo</SubmitButton>
            </ActionForm>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-2xl">Current pastor photo</h2>
          {pastor ? (
            <>
              <p className="mt-1 text-sm text-stone-600">{pastor.fullName}{pastor.title ? `, ${pastor.title}` : ""}</p>
              <div className="relative mt-4 h-40 w-40 overflow-hidden rounded-full bg-brand-50">
                {pastor.photoUrl ? (
                  <Image src={pastor.photoUrl} alt={`Photo of ${pastor.fullName}`} fill sizes="160px" className="object-cover" unoptimized={!shouldOptimizeImage(pastor.photoUrl)} />
                ) : (
                  <p className="flex h-full items-center justify-center p-4 text-center text-xs text-stone-600">No photo yet</p>
                )}
              </div>
              {pastor.photoUrl ? (
                <div className="mt-4">
                  <ActionForm action={removePastorPhotoAction}>
                    <input type="hidden" name="churchId" value={church.id} />
                    <SubmitButton variant="secondary" pendingLabel="Removing…">Remove pastor photo</SubmitButton>
                  </ActionForm>
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-stone-700">
              Add the lead pastor’s name on the <Link className="underline" href={`/dashboard/churches/${slug}/edit#leadership`}>Listing</Link> tab first.
            </p>
          )}
        </Card>
        {pastor ? (
          <Card className="p-6">
            <h2 className="font-display text-2xl">Replace pastor photo</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">A clear, recent photo of {pastor.fullName}. Only add a photo the pastor has agreed to share publicly.</p>
            <div className="mt-4">
              <ActionForm action={savePastorPhotoAction} fieldLabels={{ pastorImageUrl: "Image link", pastorFile: "Photo file", pastor_credit: "Credit", pastor_permission: "Permission" }}>
                <input type="hidden" name="churchId" value={church.id} />
                {uploadBlocked ? <UploadNotice reason={uploadBlocked} slug={slug} canManage={canManage} /> : <PhotoFileInput name="pastorFile" label="Upload the pastor’s photo (JPEG, PNG, or WebP, up to 4 MB)" />}
                <TextField name="pastorImageUrl" label={uploadBlocked ? "Image link (https)" : "…or paste an image link (https)"} type="url" />
                <TextField name="pastorCredit" label="Who took or published it?" required />
                <TextAreaField name="pastorPermission" label="Why we may use it" required hint="For example: “Provided by the pastor for the directory”." />
                <SubmitButton pendingLabel="Saving…">Save pastor photo</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        ) : null}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-2xl">Photo gallery</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          Up to {MAX_GALLERY_PHOTOS} more photos for your profile: the building, the sanctuary, ministries in action. Only add photos your church took or has permission to use, and only show people who agreed to be photographed.
        </p>
        {gallery.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.map((photo) => (
              <li key={photo.id} className="overflow-hidden rounded-2xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
                <div className="space-y-2 p-3 text-xs text-stone-600">
                  {photo.caption ? <p className="text-sm text-ink">{photo.caption}</p> : null}
                  <p>Photo: {photo.credit}</p>
                  <ActionForm action={removeGalleryPhotoAction}>
                    <input type="hidden" name="churchId" value={church.id} />
                    <input type="hidden" name="photoId" value={photo.id} />
                    <SubmitButton variant="secondary" pendingLabel="Removing…">
                      Remove
                    </SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {gallery.length < MAX_GALLERY_PHOTOS ? (
          <div className="mt-6 max-w-2xl">
            <ActionForm action={addGalleryPhotoAction} resetOnSuccess fieldLabels={{ imageUrl: "Image link", file: "Photo file" }}>
              <input type="hidden" name="churchId" value={church.id} />
              {uploadBlocked ? <UploadNotice reason={uploadBlocked} slug={slug} canManage={canManage} /> : <PhotoFileInput />}
              <TextField name="imageUrl" label={uploadBlocked ? "Image link (https)" : "…or paste an image link (https)"} type="url" />
              <TextField name="caption" label="Caption (optional)" />
              <TextField name="credit" label="Who took or published it?" required />
              <TextAreaField name="permission" label="Why we may use it" required hint="For example: “Our own photo”." />
              <SubmitButton pendingLabel="Adding…">Add to gallery</SubmitButton>
            </ActionForm>
          </div>
        ) : null}
      </Card>
    </>
  );
}
