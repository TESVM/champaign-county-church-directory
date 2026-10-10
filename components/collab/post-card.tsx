import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import { collabCategoryLabel } from "@/lib/collab";
import { formatChicago } from "@/lib/time/chicago";

export type PostSummary = {
  id: string;
  category: string;
  title: string;
  body: string;
  location: string | null;
  expiresAt: Date;
  createdAt: Date;
  organizationName: string | null;
  church: { slug: string; name: string; city: string } | null;
};

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="flex h-full flex-col rounded-[24px] border border-line bg-white p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">{collabCategoryLabel(post.category)}</p>
      <h3 className="mt-2 font-display text-xl leading-tight text-ink">
        <Link href={`/collaborate/${post.id}`} className="focus-ring hover:text-brand-700">
          {post.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-stone-600">
        {post.church ? (
          <Link href={`/churches/${post.church.slug}`} className="font-medium text-brand-900 hover:underline">
            {post.church.name}
          </Link>
        ) : (
          post.organizationName
        )}
        {post.church ? ` · ${post.church.city}` : ""}
      </p>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-700">{post.body}</p>
      <div className="mt-auto space-y-1 pt-4 text-xs text-stone-500">
        {post.location ? (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {post.location}
          </p>
        ) : null}
        <p className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Posted {formatChicago(post.createdAt, { month: "short", day: "numeric" })} · up until {formatChicago(new Date(post.expiresAt.getTime() - 1), { month: "short", day: "numeric" })}
        </p>
      </div>
    </article>
  );
}
