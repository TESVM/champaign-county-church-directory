"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * Without this, any thrown error -- including every Zod validation failure in a
 * server action -- rendered Next's bare "Application error" page, with the
 * user's typed input gone and no way back except the browser Back button.
 */
export default function RouteError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="rounded-[28px] border border-line bg-surface p-8 shadow-card">
        <h1 className="font-display text-3xl text-ink">Something went wrong</h1>
        <p className="mt-4 leading-7 text-stone-700">
          We could not load this page. This is our problem, not yours. Try again,
          and if it keeps happening let us know.
        </p>
        {error.digest ? (
          <p className="mt-4 text-sm text-stone-600">
            Reference code: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/directory">Back to the directory</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/contact">Report a problem</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
