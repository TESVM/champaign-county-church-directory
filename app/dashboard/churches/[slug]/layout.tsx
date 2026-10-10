import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { loadManagedChurch } from "@/lib/dashboard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Manage ${slug.replace(/-/g, " ")}`, robots: { index: false } };
}

export default async function ChurchDashboardLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { church, row } = await loadManagedChurch(slug);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm">
        <Link href="/dashboard" className="font-semibold text-brand-900 underline-offset-4 hover:underline">My churches</Link>
        <span className="text-stone-500"> / </span>
        <span className="text-stone-700">{church.name}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl">{church.name}</h1>
        <Link href={`/churches/${church.slug}`} className="text-sm font-semibold text-brand-900 underline-offset-4 hover:underline">View public listing</Link>
      </div>
      {row.status !== "ACTIVE" ? (
        <p role="status" className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-950">This listing is currently {row.status.toLowerCase()} and not shown in search. Contact the directory if that is wrong.</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}
