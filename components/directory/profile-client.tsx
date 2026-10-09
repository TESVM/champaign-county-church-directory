"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { sendActivity } from "@/components/directory/tracked-link";

/** Counts one profile view per page load, client-side, so crawlers that do not run scripts are not counted. */
export function ProfileViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `cccd.viewed.${slug}`;
    try {
      // One count per browser tab session, so refreshing does not inflate numbers.
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore storage errors
    }
    sendActivity(slug, "profile_view");
  }, [slug]);
  return null;
}

export function ShareButton({ slug, url, name }: { slug: string; url: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    sendActivity(slug, "share");
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // The person cancelled the share sheet or clipboard was blocked.
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink hover:border-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}

export function CopyField({ value, label, slug }: { value: string; label: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor={`copy-${label}`}>
        {label}
      </label>
      <input id={`copy-${label}`} readOnly value={value} className="h-12 flex-1 rounded-2xl border border-line bg-white px-4 text-sm" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            sendActivity(slug, "share");
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            setCopied(false);
          }
        }}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-brand-900 px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
      </button>
    </div>
  );
}
