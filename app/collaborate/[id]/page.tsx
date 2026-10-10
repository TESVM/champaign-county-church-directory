import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { ReportForm } from "@/components/collab/report-form";
import { collabCategoryLabel } from "@/lib/collab";
import { getCollabPost } from "@/lib/services/collab";
import { formatChicago } from "@/lib/time/chicago";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getCollabPost((await params).id);
  if (!post) return { title: "Post not found", robots: { index: false } };
  return { title: `${post.title} · Church Collaboration Board`, description: post.body.slice(0, 160), robots: { index: false } };
}

export default async function CollabPostPage({ params }: Props) {
  const post = await getCollabPost((await params).id);
  if (!post) notFound();
  const by = post.church ? post.church.name : post.organizationName;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm">
        <Link href="/collaborate" className="underline">
          Collaboration Board
        </Link>{" "}
        / {collabCategoryLabel(post.category)}
      </p>
      <h1 className="font-display text-4xl text-ink">{post.title}</h1>
      <p className="text-stone-600">
        Shared by{" "}
        {post.church ? (
          <Link href={`/churches/${post.church.slug}`} className="font-semibold text-brand-900 underline">
            {by}
          </Link>
        ) : (
          by
        )}{" "}
        · posted {formatChicago(post.createdAt, { month: "long", day: "numeric" })} · up until {formatChicago(new Date(post.expiresAt.getTime() - 1), { month: "long", day: "numeric" })}
      </p>
      <p className="whitespace-pre-line text-lg leading-8 text-stone-800">{post.body}</p>
      {post.location ? (
        <p className="flex items-center gap-2 text-stone-700">
          <MapPin className="h-4 w-4 text-brand-700" aria-hidden="true" /> {post.location}
        </p>
      ) : null}
      <section className="space-y-2 rounded-[24px] border border-line bg-white p-5 shadow-card">
        <h2 className="font-display text-2xl">Respond</h2>
        {post.contactName ? <p className="text-sm text-stone-700">Contact: {post.contactName}</p> : null}
        {post.contactEmail ? (
          <a href={`mailto:${post.contactEmail}?subject=${encodeURIComponent(post.title)}`} className="flex min-h-[40px] items-center gap-2 text-sm font-semibold text-brand-900 hover:underline">
            <Mail className="h-4 w-4" aria-hidden="true" /> {post.contactEmail}
          </a>
        ) : null}
        {post.contactPhone ? (
          <a href={`tel:${post.contactPhone.replace(/\D/g, "")}`} className="flex min-h-[40px] items-center gap-2 text-sm font-semibold text-brand-900 hover:underline">
            <Phone className="h-4 w-4" aria-hidden="true" /> {post.contactPhone}
          </a>
        ) : null}
        {post.contactUrl ? (
          <a href={post.contactUrl} target="_blank" rel="noopener noreferrer nofollow" className="flex min-h-[40px] items-center gap-2 text-sm font-semibold text-brand-900 hover:underline">
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Sign up or learn more
          </a>
        ) : null}
      </section>
      <ReportForm postId={post.id} />
    </div>
  );
}
