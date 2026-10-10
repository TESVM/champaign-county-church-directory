"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * A link that adds one to a church's anonymous daily activity count when
 * clicked. Nothing identifying the visitor is sent.
 */
export function sendActivity(churchSlug: string, metric: string) {
  try {
    const body = JSON.stringify({ slug: churchSlug, metric });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/activity", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/activity", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // Counting is best-effort and must never block navigation.
  }
}

export function TrackedLink({
  churchSlug,
  metric,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { churchSlug: string; metric: string; children: ReactNode }) {
  return (
    <a
      {...props}
      onClick={(event) => {
        sendActivity(churchSlug, metric);
        props.onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
