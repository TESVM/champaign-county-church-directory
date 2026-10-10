import Link from "next/link";

const TABS = [
  ["", "Overview"],
  ["/edit", "Listing"],
  ["/visit", "Plan your visit"],
  ["/photo", "Photo"],
  ["/events", "Events"],
  ["/resources", "Community help"],
  ["/team", "Team"],
  ["/billing", "Billing"],
  ["/share", "Share & QR"]
] as const;

export function ChurchTabs({ slug, current, canManage }: { slug: string; current: string; canManage: boolean }) {
  return (
    <nav aria-label="Church dashboard" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-2 border-b border-line pb-3">
        {TABS.filter(([path]) => canManage || (path !== "/team" && path !== "/billing")).map(([path, label]) => {
          const active = current === path;
          return (
            <li key={path}>
              <Link
                href={`/dashboard/churches/${slug}${path}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold focus-ring ${active ? "bg-brand-900 text-white" : "bg-white text-ink ring-1 ring-line hover:ring-brand-700"}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
