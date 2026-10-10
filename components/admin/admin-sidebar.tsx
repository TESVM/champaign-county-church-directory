import Link from "next/link";
import { SignOutButton } from "@/components/layout/sign-out-button";

export function AdminSidebar({ counts, isAdmin }: { counts: Record<string, number>; isAdmin: boolean }) {
  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/claims", label: "Claim requests", count: counts.claims },
    { href: "/admin/submissions", label: "New churches", count: counts.submissions },
    { href: "/admin/inbox", label: "Messages & corrections", count: counts.inbox },
    { href: "/admin/review", label: "Website review", count: counts.changes },
    { href: "/admin/resources", label: "Community programs", count: counts.resources },
    { href: "/admin/churches", label: "Churches" },
    ...(isAdmin ? [{ href: "/admin/users", label: "Users & staff" }] : []),
    { href: "/admin/audit", label: "Audit log" },
    { href: "/admin/outbox", label: "Email log" }
  ];
  return (
    <aside className="rounded-[28px] bg-brand-900 p-5 text-white shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky">Directory admin</p>
      <nav aria-label="Admin" className="mt-4 flex flex-col gap-1">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="flex min-h-[44px] items-center justify-between rounded-2xl px-4 text-sm font-medium hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {item.label}
            {item.count ? <span className="rounded-full bg-rose px-2 py-0.5 text-xs font-bold text-white">{item.count}<span className="sr-only"> waiting</span></span> : null}
          </Link>
        ))}
      </nav>
      <div className="mt-5">
        <SignOutButton returnPath="/" />
      </div>
    </aside>
  );
}
