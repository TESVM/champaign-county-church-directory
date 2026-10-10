import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/collab/post-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { COLLAB_CATEGORIES } from "@/lib/collab";
import { listCollabPosts } from "@/lib/services/collab";

export const metadata: Metadata = {
  title: "Church Collaboration Board",
  description: "Volunteer needs, shared space, food and clothing help, musicians, transportation, and ministry partnerships between churches across Champaign County. Every post is reviewed.",
  alternates: { canonical: "/collaborate" }
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CollaboratePage({ searchParams }: { searchParams: Search }) {
  const raw = (await searchParams).category;
  const category = (Array.isArray(raw) ? raw[0] : raw) || undefined;
  const posts = await listCollabPosts({ category });

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          as="h1"
          eyebrow="Church Collaboration Board"
          title="Churches helping churches"
          description="Practical needs and offers shared by churches and ministries across Champaign County. Every post is reviewed before it appears and comes down on its end date."
        />
        <Link href="/collaborate/new" className="inline-flex min-h-[48px] shrink-0 items-center rounded-full bg-brand-900 px-6 text-sm font-semibold text-white hover:bg-brand-700">
          Share an opportunity
        </Link>
      </div>

      <nav aria-label="Categories" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {[["", "Everything"] as const, ...COLLAB_CATEGORIES].map(([key, label]) => {
            const active = (category ?? "") === key;
            return (
              <li key={key}>
                <Link
                  href={key ? `/collaborate?category=${key}` : "/collaborate"}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[40px] items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${active ? "bg-brand-900 text-white" : "border border-line bg-white text-stone-700 hover:bg-brand-50"}`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p role="status" className="text-sm text-stone-700">
        {posts.length === 1 ? "1 open post" : `${posts.length} open posts`}
      </p>
      {posts.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-stone-700">
          Nothing posted here yet. Church teams can{" "}
          <Link href="/collaborate/new" className="font-semibold text-brand-900 underline">
            share a need or an offer
          </Link>
          .
        </p>
      )}

      <aside className="rounded-[24px] bg-stone-50 p-6 text-sm leading-6 text-stone-700">
        <p className="font-semibold text-ink">How the board works</p>
        <p className="mt-1">
          Posts come from church teams who manage their listing, and from ministries the directory has added. A reviewer checks each one. Posts expire after at most 90 days, and anyone can report a post that looks wrong. This is not a place for
          prayer requests or personal information.
        </p>
      </aside>
    </div>
  );
}
