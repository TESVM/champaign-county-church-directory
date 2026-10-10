"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Saves churches in this browser only (localStorage). No account, cookie, or
 * server record is involved, so nothing about the visitor leaves the device.
 */
export const FAVORITES_KEY = "cccd.savedChurches";

export function readFavorites(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, 100) : [];
  } catch {
    return [];
  }
}

export function writeFavorites(slugs: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(slugs.slice(0, 100)));
    window.dispatchEvent(new Event("cccd-favorites"));
  } catch {
    // Storage may be unavailable (private mode); saving simply does not persist.
  }
}

export function SaveChurchButton({ slug, name, compact = false }: { slug: string; name: string; compact?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(readFavorites().includes(slug));
    sync();
    setReady(true);
    window.addEventListener("cccd-favorites", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("cccd-favorites", sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  const toggle = () => {
    const current = readFavorites();
    writeFavorites(saved ? current.filter((s) => s !== slug) : [...current.filter((s) => s !== slug), slug]);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved churches` : `Save ${name}`}
      className={
        compact
          ? "inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-brand-900 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          : "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink hover:border-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      }
    >
      <Heart className={`h-4 w-4 ${saved ? "fill-rose text-rose" : ""}`} aria-hidden="true" />
      {compact ? null : saved ? "Saved" : "Save"}
    </button>
  );
}
