"use client";

import { type ReactNode, useEffect, useRef } from "react";

/** A disclosure that starts closed on phones and stays open on wide screens. */
export function ResponsiveDetails({ summary, children, defaultOpen = false }: { summary: string; children: ReactNode; defaultOpen?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      if (ref.current && wide.matches) ref.current.open = true;
    };
    apply();
    wide.addEventListener("change", apply);
    return () => wide.removeEventListener("change", apply);
  }, []);
  return (
    <details ref={ref} open={defaultOpen} className="group">
      <summary className="focus-ring flex min-h-[44px] cursor-pointer list-none items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink lg:hidden">
        {summary}
      </summary>
      <div className="mt-3 lg:mt-0">{children}</div>
    </details>
  );
}
