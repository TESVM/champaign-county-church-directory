import Link from "next/link";
import { closeCollabPostAction } from "@/app/actions";
import { ChurchTabs } from "@/components/dashboard/church-tabs";
import { ActionForm, SubmitButton } from "@/components/forms/action-form";
import { Card } from "@/components/ui/card";
import { collabCategoryLabel } from "@/lib/collab";
import { loadManagedChurch } from "@/lib/dashboard";
import { listCollabPostsForChurch } from "@/lib/services/collab";
import { formatChicago } from "@/lib/time/chicago";

export default async function CollaborateDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, actor, canManage } = await loadManagedChurch(slug, "/collaborate");
  const posts = await listCollabPostsForChurch(actor, church.id);
  const now = new Date();
  const state = (p: (typeof posts)[number]) =>
    p.closedAt ? "Taken down" : p.expiresAt <= now ? "Expired" : p.status === "APPROVED" ? "Live on the board" : p.status === "REJECTED" ? "Not published" : p.reviewerNote ? "Hidden for review" : "Waiting for review";

  return (
    <>
      <ChurchTabs slug={slug} current="/collaborate" canManage={canManage} />
      <Card className="mt-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-3xl">Collaboration Board</h2>
          <Link href={`/collaborate/new?church=${church.id}`} className="inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-700">
            Share an opportunity
          </Link>
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          Ask other churches for volunteers, space, musicians, or equipment, or offer what you have. Free for every claimed listing. Posts are reviewed, and your open posts also appear on your profile under “Ministry opportunities”.
        </p>
        {posts.length ? (
          <ul className="mt-6 space-y-3">
            {posts.map((p) => (
              <li key={p.id} className="rounded-2xl border border-line p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                  {collabCategoryLabel(p.category)} · {state(p)}
                </p>
                <p className="mt-1 font-semibold text-ink">{p.title}</p>
                <p className="text-sm text-stone-600">Until {formatChicago(new Date(p.expiresAt.getTime() - 1), { month: "long", day: "numeric" })}</p>
                {p.reviewerNote && p.status !== "APPROVED" ? <p className="mt-1 text-sm text-stone-700">Reviewer note: {p.reviewerNote}</p> : null}
                {!p.closedAt && p.expiresAt > now ? (
                  <div className="mt-2">
                    <ActionForm action={closeCollabPostAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton variant="secondary" pendingLabel="Taking down…">
                        Take down
                      </SubmitButton>
                    </ActionForm>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-stone-600">No posts yet.</p>
        )}
      </Card>
    </>
  );
}
