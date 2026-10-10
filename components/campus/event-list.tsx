"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, CalendarPlus, ExternalLink, MapPin, Repeat } from "lucide-react";
import { campusLabel, eventCategoryLabel } from "@/lib/campus";

export type CampusEventView = {
  key: string;
  icsUrl: string;
  title: string;
  description: string | null;
  location: string | null;
  registrationUrl: string | null;
  dateLabel: string;
  timeLabel: string | null;
  weekly: boolean;
  categories: string[];
  campuses: string[];
  host: { name: string; href: string | null };
};

const STORAGE_KEY = "cccd.savedCampusEvents";

function readSaved(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function CampusEventList({ events }: { events: CampusEventView[] }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [onlySaved, setOnlySaved] = useState(false);
  useEffect(() => setSaved(readSaved()), []);

  function toggle(key: string) {
    const next = saved.includes(key) ? saved.filter((k) => k !== key) : [...saved, key];
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing: saving simply does not persist.
    }
  }

  const shown = onlySaved ? events.filter((e) => saved.includes(e.key)) : events;

  return (
    <div className="space-y-4">
      <label className="inline-flex min-h-[44px] items-center gap-3 text-sm text-stone-700">
        <input type="checkbox" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} className="h-5 w-5 rounded border-line text-brand-700" />
        Show only events I saved ({saved.filter((k) => events.some((e) => e.key === k)).length})
      </label>
      {shown.length ? (
        <ul className="space-y-3">
          {shown.map((e) => {
            const isSaved = saved.includes(e.key);
            return (
              <li key={e.key} className="rounded-[22px] border border-line bg-white p-5 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-700">
                      {e.dateLabel}
                      {e.timeLabel ? ` · ${e.timeLabel}` : ""}
                    </p>
                    <h3 className="mt-1 font-display text-xl text-ink">{e.title}</h3>
                    <p className="mt-1 text-sm text-stone-600">
                      Hosted by{" "}
                      {e.host.href ? (
                        <Link href={e.host.href} className="font-medium text-brand-900 underline-offset-2 hover:underline">
                          {e.host.name}
                        </Link>
                      ) : (
                        e.host.name
                      )}
                      {e.campuses.length ? ` · ${e.campuses.map(campusLabel).join(", ")}` : ""}
                    </p>
                    {e.location ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
                        <MapPin className="h-4 w-4" aria-hidden="true" /> {e.location}
                      </p>
                    ) : null}
                    {e.description ? <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-stone-700">{e.description}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.weekly ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                          <Repeat className="h-3.5 w-3.5" aria-hidden="true" /> Weekly
                        </span>
                      ) : null}
                      {e.categories.map((c) => (
                        <span key={c} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900">
                          {eventCategoryLabel(c)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                    <button
                      type="button"
                      onClick={() => toggle(e.key)}
                      aria-pressed={isSaved}
                      className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-brand-50"
                    >
                      {isSaved ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
                      {isSaved ? "Saved" : "Save"}
                    </button>
                    <a href={e.icsUrl} className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-brand-50">
                      <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Add to calendar
                    </a>
                    {e.registrationUrl ? (
                      <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand-900 px-4 text-sm font-semibold text-white hover:bg-brand-700">
                        Register <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-[22px] border border-dashed border-line bg-white p-6 text-sm text-stone-600">
          {onlySaved ? "You have not saved any of these events yet. Saved events stay in this browser only." : "No student events match yet."}
        </p>
      )}
    </div>
  );
}
