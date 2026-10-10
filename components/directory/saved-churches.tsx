"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readFavorites, writeFavorites } from "@/components/directory/save-church-button";

type Saved = { slug: string; name: string; city: string; address: string; services: string };

export function SavedChurches() {
  const [state, setState] = useState<{ status: "loading" | "ready" | "error"; items: Saved[]; message?: string }>({ status: "loading", items: [] });

  useEffect(() => {
    const load = async () => {
      const slugs = readFavorites();
      if (!slugs.length) return setState({ status: "ready", items: [] });
      try {
        const response = await fetch(`/api/churches/lookup?slugs=${slugs.map(encodeURIComponent).join(",")}`);
        const body = (await response.json()) as { ok: boolean; data?: Saved[]; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error);
        const bySlug = new Map((body.data ?? []).map((c) => [c.slug, c]));
        setState({ status: "ready", items: slugs.map((s) => bySlug.get(s)).filter((c): c is Saved => Boolean(c)) });
      } catch (error) {
        setState({ status: "error", items: [], message: error instanceof Error && error.message ? error.message : "We could not load your saved churches. Check your connection and try again." });
      }
    };
    void load();
    window.addEventListener("cccd-favorites", load);
    return () => window.removeEventListener("cccd-favorites", load);
  }, []);

  if (state.status === "loading") return <p role="status" className="text-sm text-stone-600">Loading saved churches…</p>;
  if (state.status === "error") return <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-900">{state.message}</p>;
  if (!state.items.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-line p-8 text-center">
        <p className="font-display text-2xl">Nothing saved yet</p>
        <p className="mt-2 text-sm text-stone-600">Tap the heart on any church to keep it here.</p>
        <Link href="/directory" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white">Browse the directory</Link>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {state.items.map((c) => (
        <li key={c.slug} className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href={`/churches/${c.slug}`} className="font-display text-xl hover:underline">{c.name}</Link>
            <p className="text-sm text-stone-600">{[c.address, c.city].filter(Boolean).join(", ")}</p>
            {c.services ? <p className="text-sm text-stone-700">{c.services}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => writeFavorites(readFavorites().filter((s) => s !== c.slug))}
            className="min-h-[44px] rounded-full border border-line px-4 text-sm font-semibold hover:border-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Remove<span className="sr-only"> {c.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
