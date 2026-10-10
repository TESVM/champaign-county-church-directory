"use client";

import "leaflet/dist/leaflet.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { Accessibility, Baby, GraduationCap, List, LocateFixed, Map as MapIcon, Radio, ShieldCheck, Star, X } from "lucide-react";
import type { MapPin } from "@/lib/services/churches";
import { milesBetween } from "@/lib/campus";
import { shouldOptimizeImage } from "@/lib/images";

/** Center of Champaign County, roughly between Champaign-Urbana and Rantoul. */
const COUNTY_CENTER: [number, number] = [40.16, -88.2];

function pinHtml(pin: MapPin, selected: boolean) {
  const size = pin.featured ? 38 : 30;
  const fill = pin.featured ? "#b45309" : selected ? "#12363e" : "#1f5f63";
  const ring = selected ? "box-shadow:0 0 0 4px rgba(47,143,136,.45);" : "";
  const star = pin.featured
    ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="#fff" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg>`
    : `<span style="width:8px;height:8px;border-radius:9999px;background:#fff;display:block"></span>`;
  return `<div style="width:${size}px;height:${size}px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:${fill};border:2px solid #fff;display:flex;align-items:center;justify-content:center;${ring}box-shadow:0 2px 6px rgba(0,0,0,.35)"><div style="transform:rotate(45deg);display:flex">${star}</div></div>`;
}

function Indicators({ pin }: { pin: MapPin }) {
  const items = [
    pin.featured && { icon: Star, label: "Featured" },
    pin.verified && { icon: ShieldCheck, label: "Details checked" },
    pin.livestream && { icon: Radio, label: "Livestream" },
    pin.wheelchair && { icon: Accessibility, label: "Wheelchair access (church-reported)" },
    pin.children && { icon: Baby, label: "Children’s program" },
    pin.student && { icon: GraduationCap, label: "Student-friendly" }
  ].filter(Boolean) as Array<{ icon: typeof Star; label: string }>;
  if (!items.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Highlights">
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${label === "Featured" ? "bg-amber-50 text-amber-800" : "bg-brand-50 text-brand-900"}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}

function PreviewCard({ pin, distance, onClose, onShow }: { pin: MapPin; distance?: number; onClose?: () => void; onShow?: () => void }) {
  return (
    <article className={`relative flex gap-3 rounded-[22px] border bg-white p-3 shadow-card ${pin.featured ? "border-amber-300" : "border-line"}`}>
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-brand-50">
        {pin.imageUrl ? (
          <Image src={pin.imageUrl} alt="" fill sizes="96px" className="object-cover" unoptimized={!shouldOptimizeImage(pin.imageUrl)} />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-brand-900">Photo not yet provided</div>
        )}
      </div>
      <div className="min-w-0 flex-1 pr-6">
        <h3 className="font-display text-lg leading-tight text-ink">
          <Link href={`/churches/${pin.slug}`} className="focus-ring hover:text-brand-700">
            {pin.name}
          </Link>
        </h3>
        <p className="text-sm text-stone-600">
          {pin.city}
          {pin.denomination ? ` · ${pin.denomination}` : ""}
          {distance !== undefined ? ` · ${distance < 0.1 ? "<0.1" : distance.toFixed(1)} mi` : ""}
        </p>
        <p className="mt-1 text-sm font-medium text-stone-800">{pin.nextService ? `Next service: ${pin.nextService}` : "Service times not listed yet"}</p>
        <Indicators pin={pin} />
        {onShow && pin.latitude != null ? (
          <button type="button" onClick={onShow} className="focus-ring mt-2 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline">
            Show on map
          </button>
        ) : null}
      </div>
      {onClose ? (
        <button type="button" onClick={onClose} className="focus-ring absolute right-2 top-2 rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Close preview">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </article>
  );
}

export function ChurchMap({ pins, initialView = "map" }: { pins: MapPin[]; initialView?: "map" | "list" }) {
  const [view, setView] = useState<"map" | "list">(initialView);
  const [selected, setSelected] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<"idle" | "busy" | "denied" | "unavailable">("idle");
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, Marker>());

  const located = useMemo(() => pins.filter((p) => p.latitude != null && p.longitude != null), [pins]);
  const unlocated = pins.length - located.length;
  const distances = useMemo(() => {
    const out = new Map<string, number>();
    if (me) for (const p of located) out.set(p.slug, milesBetween(me, { lat: p.latitude!, lng: p.longitude! }));
    return out;
  }, [me, located]);
  const ordered = useMemo(() => {
    if (!me) return pins;
    return [...pins].sort((a, b) => (distances.get(a.slug) ?? Infinity) - (distances.get(b.slug) ?? Infinity));
  }, [pins, me, distances]);
  const selectedPin = pins.find((p) => p.slug === selected) ?? null;

  // Build the map once, on the client only.
  useEffect(() => {
    if (view !== "map" || !mapEl.current || mapRef.current) return;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !mapEl.current) return;
      const map = L.map(mapEl.current, { scrollWheelZoom: false, zoomControl: true }).setView(COUNTY_CENTER, 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    });
    return () => {
      cancelled = true;
    };
  }, [view]);

  // Tear the map down when switching to the list or leaving the page.
  useEffect(() => {
    if (view === "map") return;
    mapRef.current?.remove();
    mapRef.current = null;
    markers.current.clear();
  }, [view]);
  useEffect(() => () => void mapRef.current?.remove(), []);

  // Sync markers with the current pins and selection.
  useEffect(() => {
    if (view !== "map") return;
    let cancelled = false;
    const sync = async () => {
      const L = await import("leaflet");
      for (let i = 0; i < 20 && !mapRef.current; i += 1) await new Promise((r) => setTimeout(r, 50));
      const map = mapRef.current;
      if (cancelled || !map) return;
      for (const marker of markers.current.values()) marker.remove();
      markers.current.clear();
      for (const pin of located) {
        const isSelected = pin.slug === selected;
        const size = pin.featured ? 38 : 30;
        const marker = L.marker([pin.latitude!, pin.longitude!], {
          title: pin.featured ? `${pin.name} (Featured)` : pin.name,
          alt: pin.name,
          keyboard: true,
          riseOnHover: true,
          zIndexOffset: pin.featured ? 1000 : isSelected ? 500 : 0,
          icon: L.divIcon({ className: "", html: pinHtml(pin, isSelected), iconSize: [size, size], iconAnchor: [size / 2, size] })
        })
          .on("click keypress", () => setSelected(pin.slug))
          .addTo(map);
        markers.current.set(pin.slug, marker);
      }
      const chosen = located.find((p) => p.slug === selected);
      if (chosen) map.panTo([chosen.latitude!, chosen.longitude!]);
      else if (located.length) {
        const bounds = L.latLngBounds(located.map((p) => [p.latitude!, p.longitude!] as [number, number]));
        if (me) bounds.extend([me.lat, me.lng]);
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
      }
      if (me) {
        L.circleMarker([me.lat, me.lng], { radius: 8, color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 3, interactive: false }).addTo(map);
      }
    };
    void sync();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located, selected, me, view]);

  function locate() {
    if (!("geolocation" in navigator)) return setLocating("unavailable");
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating("idle");
      },
      (err) => setLocating(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="View" className="inline-flex rounded-full border border-line bg-white p-1">
          {(["map", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-sm font-semibold ${view === v ? "bg-brand-900 text-white" : "text-stone-700 hover:bg-brand-50"}`}
            >
              {v === "map" ? <MapIcon className="h-4 w-4" aria-hidden="true" /> : <List className="h-4 w-4" aria-hidden="true" />}
              {v === "map" ? "Map" : "List"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={me ? () => setMe(null) : locate}
          className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-brand-50"
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
          {me ? "Stop using my location" : locating === "busy" ? "Finding you…" : "Near me"}
        </button>
        <p className="text-sm text-stone-600" role="status">
          {pins.length === 1 ? "1 church" : `${pins.length} churches`}
          {unlocated ? ` · ${unlocated} not on the map yet (address not matched)` : ""}
          {locating === "denied" ? " · Location permission was declined, so distances are hidden." : ""}
          {locating === "unavailable" ? " · Your location could not be found." : ""}
        </p>
      </div>
      {me ? <p className="text-xs text-stone-500">Your location stays in this browser. It is used only to sort by distance and is never sent to the directory.</p> : null}

      {view === "map" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="relative isolate">
            <div ref={mapEl} className="h-[60vh] min-h-[380px] w-full overflow-hidden rounded-[28px] border border-line bg-brand-50 shadow-card" aria-label="Map of churches. Use the list view for a keyboard-friendly list." role="region" />
            {selectedPin ? (
              <div className="absolute inset-x-3 bottom-3 z-[500] lg:hidden">
                <PreviewCard pin={selectedPin} distance={distances.get(selectedPin.slug)} onClose={() => setSelected(null)} />
              </div>
            ) : null}
          </div>
          <div className="hidden max-h-[60vh] min-h-[380px] space-y-3 overflow-y-auto pr-1 lg:block">
            {selectedPin ? <PreviewCard pin={selectedPin} distance={distances.get(selectedPin.slug)} onClose={() => setSelected(null)} /> : null}
            {ordered
              .filter((p) => p.slug !== selected)
              .slice(0, 40)
              .map((pin) => (
                <PreviewCard key={pin.slug} pin={pin} distance={distances.get(pin.slug)} onShow={() => setSelected(pin.slug)} />
              ))}
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {ordered.map((pin) => (
            <li key={pin.slug}>
              <PreviewCard pin={pin} distance={distances.get(pin.slug)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
