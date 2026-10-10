import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guards";
import { getChurchBySlug } from "@/lib/services/churches";
import { profileChecklist } from "@/lib/services/completion";

export const metadata: Metadata = { title: "My churches", robots: { index: false } };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const actor = await requireUser("/dashboard");
  const { denied } = await searchParams;
  const churches = (await Promise.all(actor.memberships.map((m) => getChurchBySlug(m.churchSlug, { includeHidden: true }))))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({ church: r.church, role: actor.memberships.find((m) => m.churchId === r.church.id)?.role }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-stone-600">Signed in as {actor.email}</p>
          <h1 className="font-display text-4xl">My churches</h1>
        </div>
        <div className="flex gap-3">
          {actor.staffRole ? (
            <Link href="/admin" className="inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white focus-ring">Directory admin</Link>
          ) : null}
          <SignOutButton />
        </div>
      </div>
      {denied ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-900">You do not have access to that page.</p> : null}

      {churches.length ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {churches.map(({ church, role }) => {
            const items = profileChecklist(church);
            const done = items.filter((i) => i.done).length;
            return (
              <Card key={church.id} className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{role === "CHURCH_OWNER" ? "Owner" : "Editor"}</p>
                <h2 className="mt-1 font-display text-2xl">{church.name}</h2>
                <p className="mt-1 text-sm text-stone-600">{church.city} · {church.enhancedProfile ? "Enhanced profile" : "Free listing"}</p>
                <div className="mt-4" aria-label={`Profile ${Math.round((done / items.length) * 100)}% complete`}>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-50"><div className="h-full bg-brand-700" style={{ width: `${(done / items.length) * 100}%` }} /></div>
                  <p className="mt-2 text-sm text-stone-700">{done} of {items.length} profile steps complete</p>
                </div>
                <Link href={`/dashboard/churches/${church.slug}`} className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-700 focus-ring">
                  Manage listing
                </Link>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mt-8 p-8">
          <h2 className="font-display text-2xl">{actor.staffRole ? "You are directory staff" : "No churches yet"}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            {actor.staffRole
              ? "Use the admin area to review claims, submissions, and listings."
              : "Your account is not connected to a church. If you requested access, it may still be under review, or your access may have been removed."}
          </p>
          {!actor.staffRole ? (
            <Link href="/claim" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white focus-ring">Request to manage a listing</Link>
          ) : null}
        </Card>
      )}
    </div>
  );
}
