import type { Metadata } from "next";
import { verifySignInAction } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { safeReturnPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Finish signing in", robots: { index: false } };

/**
 * The emailed link lands here and asks for one click. Consuming the token on
 * GET would let email security scanners, which prefetch links, use up the
 * one-time link before the person clicks it.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; next?: string }> }) {
  const { token, next } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <Card className="p-8 text-center">
        <h1 className="font-display text-3xl">Finish signing in</h1>
        {token ? (
          <form action={verifySignInAction} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="next" value={safeReturnPath(next, "/dashboard")} />
            <button type="submit" className="min-h-[44px] rounded-full bg-brand-900 px-6 font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
              Continue to my dashboard
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-stone-700">This link is missing its sign-in code. Request a new link from the sign-in page.</p>
        )}
      </Card>
    </div>
  );
}
