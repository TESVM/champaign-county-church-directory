import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { generateChurchImageAction } from "@/app/actions";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { GenerateImageButton } from "@/components/forms/ai-image-generator";
import { requireAdminAccess } from "@/lib/auth-guards";
import {
  listChurchImagesForAdmin,
  type ChurchImageFilter,
  type ChurchImageState
} from "@/lib/data/church-images";
import { aiImageUnavailableReason } from "@/lib/env";

export const metadata: Metadata = { title: "AI Images" };
export const dynamic = "force-dynamic";
// Generating an HD image can take up to ~2.5 minutes, and server actions
// invoked from this page inherit its function time limit.
export const maxDuration = 180;

const PAGE_SIZE = 12;

const FILTERS: Array<{ value: ChurchImageFilter; label: string }> = [
  { value: "all", label: "All churches" },
  { value: "ready", label: "No image yet" },
  { value: "generated", label: "AI images" },
  { value: "photo", label: "Uploaded photos" },
  { value: "failed", label: "Needs attention" }
];

const STATE_BADGE: Record<ChurchImageState, { label: string; className: string }> = {
  ready: { label: "No image", className: "bg-stone-100 text-stone-800" },
  generated: { label: "AI image", className: "bg-brand-100 text-brand-900" },
  photo: { label: "Uploaded photo", className: "bg-emerald-100 text-emerald-900" },
  pending: { label: "Generating", className: "bg-amber-100 text-amber-900" },
  failed: { label: "Needs attention", className: "bg-red-100 text-red-800" }
};

const RESULT_TEXT: Record<string, string> = {
  "has-photo": "already has an uploaded photo, so no AI image was created. Real photos are never replaced.",
  busy: "is already being generated. Refresh in a minute.",
  "not-configured": "could not be generated because AI images are not set up yet.",
  missing: "could not be found.",
  failed: "could not be generated. The reason is shown on its row."
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminImagesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminAccess();

  const raw = await searchParams;
  const requested = first(raw.view);
  const filter: ChurchImageFilter = FILTERS.some((item) => item.value === requested)
    ? (requested as ChurchImageFilter)
    : "all";
  const q = first(raw.q) ?? "";
  const pageParam = Number(first(raw.page));
  const saved = first(raw.saved);
  const aiResult = first(raw.ai);
  const resultChurch = first(raw.church);

  const unavailable = aiImageUnavailableReason();
  const { items, counts, total, page, totalPages, names } = await listChurchImagesForAdmin({
    q,
    filter,
    page: Number.isInteger(pageParam) ? pageParam : 1,
    pageSize: PAGE_SIZE
  });

  const hrefFor = (params: { view?: string; page?: number }) => {
    const search = new URLSearchParams({ view: params.view ?? filter });
    if (q) search.set("q", q);
    if (params.page && params.page > 1) search.set("page", String(params.page));
    return `/admin/images?${search.toString()}`;
  };

  const returnPath = hrefFor({ page });
  const resultName = (resultChurch && names[resultChurch]) || "That church";

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <AdminSidebar />
        <div className="space-y-6 rounded-[36px] border border-white/70 p-5 sm:p-8">
          <header className="section-strong rounded-[30px] border border-white/70 px-6 py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">AI Images</p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl">Church profile images</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-700">
              Create an HD image for any church without a photo. Each button sends one image
              request and takes 30 to 90 seconds. The AI invents the building, so every image
              is labelled &ldquo;AI-generated image&rdquo; on the site and in the app. Uploaded
              photos are protected and never replaced.
            </p>
          </header>

          {unavailable ? (
            <div
              role="status"
              className="rounded-2xl bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200"
            >
              <p className="font-semibold">AI image generation is not set up yet.</p>
              <p className="mt-1">{unavailable}</p>
            </div>
          ) : null}

          {saved === "ai-image" ? (
            <div role="status" className="rounded-2xl bg-brand-50 px-5 py-4 text-sm text-brand-900 ring-1 ring-brand-100">
              AI image created for <strong>{resultName}</strong>. It is labelled as AI-generated on the public listing.
            </div>
          ) : null}

          {aiResult && RESULT_TEXT[aiResult] ? (
            <div
              role={aiResult === "failed" || aiResult === "not-configured" ? "alert" : "status"}
              className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-800 ring-1 ring-red-200"
            >
              <strong>{resultName}</strong> {RESULT_TEXT[aiResult]}
            </div>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                ["No image yet", counts.ready],
                ["AI images", counts.generated],
                ["Uploaded photos", counts.photo],
                ["Generating", counts.pending],
                ["Needs attention", counts.failed]
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/85 p-4 ring-1 ring-brand-100">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">{label}</dt>
                <dd className="mt-1 font-display text-3xl text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Filter churches" className="flex flex-wrap gap-2">
              {FILTERS.map((item) => {
                const active = item.value === filter;
                return (
                  <Link
                    key={item.value}
                    href={hrefFor({ view: item.value })}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ${
                      active ? "bg-brand-900 text-white ring-brand-900" : "bg-white text-stone-800 ring-line"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <form method="get" role="search" className="flex gap-2">
              <input type="hidden" name="view" value={filter} />
              <label htmlFor="image-search" className="sr-only">
                Search churches
              </label>
              <input
                id="image-search"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Search churches"
                className="h-11 rounded-full border border-line bg-white px-4 text-sm"
              />
              <button type="submit" className="h-11 rounded-full bg-brand-700 px-5 text-sm font-semibold text-white">
                Search
              </button>
            </form>
          </div>

          <p className="text-sm text-stone-700" aria-live="polite">
            {total} {total === 1 ? "church" : "churches"}
          </p>

          {items.length === 0 ? (
            <p className="rounded-2xl bg-white/85 p-8 text-center text-stone-700 ring-1 ring-brand-100">
              No churches match this filter.
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {items.map((church) => {
                const badge = STATE_BADGE[church.state];
                const isPhoto = church.state === "photo";
                return (
                  <li key={church.slug} className="overflow-hidden rounded-[24px] bg-white/90 ring-1 ring-brand-100">
                    <div className="relative aspect-[16/9] bg-brand-50">
                      {church.imageUrl ? (
                        <Image
                          src={church.imageUrl}
                          alt={
                            church.state === "generated"
                              ? `AI-generated image for ${church.name}`
                              : `Current image for ${church.name}`
                          }
                          fill
                          sizes="(max-width: 768px) 100vw, 40vw"
                          className="object-cover"
                          // Thumbnails come from many hosts, including inline
                          // uploads; skip the optimizer rather than allow-list them all.
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-stone-600">
                          No image yet
                        </div>
                      )}
                      {church.state === "generated" ? (
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
                          AI-generated image
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-xl text-ink">{church.name}</h2>
                          <p className="text-sm text-stone-700">{church.city}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>

                      {church.state === "failed" && church.error ? (
                        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{church.error}</p>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-3">
                        {isPhoto ? (
                          <p className="text-sm text-stone-700">Uploaded photo — protected</p>
                        ) : (
                          <GenerateImageButton
                            action={generateChurchImageAction}
                            churchSlug={church.slug}
                            churchName={church.name}
                            returnPath={returnPath}
                            label={church.state === "generated" ? "Generate a new image" : "Generate AI image"}
                            disabled={Boolean(unavailable) || church.state === "pending"}
                          />
                        )}
                        <Link
                          href={`/admin/churches/${church.slug}`}
                          className="text-sm font-semibold text-brand-900 underline underline-offset-2"
                        >
                          Edit church
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 ? (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-2">
              {page > 1 ? (
                <Link href={hrefFor({ page: page - 1 })} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-line">
                  Previous
                </Link>
              ) : null}
              <span className="text-sm text-stone-700">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={hrefFor({ page: page + 1 })} className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-line">
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
