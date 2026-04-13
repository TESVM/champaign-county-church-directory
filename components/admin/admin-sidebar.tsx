import Link from "next/link";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/claims", label: "Claim Requests" },
  { href: "/admin/review", label: "Review Queue" },
  { href: "/admin/churches", label: "Churches" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/content", label: "Content" }
];

export function AdminSidebar() {
  return (
    <aside className="overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 p-6 text-white shadow-soft">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky">Admin</p>
      <h2 className="mt-3 font-display text-3xl">Directory HQ</h2>
      <p className="mt-3 max-w-xs text-sm leading-6 text-white/78">
        Review changes, clean listings, and keep the public directory fresh without losing trust.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/16">
            {item.label}
          </Link>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Workflow</p>
        <p className="mt-2 text-sm leading-6 text-white/82">Website data stays strongest. Social and scan suggestions stay in review until approved.</p>
      </div>
    </aside>
  );
}
