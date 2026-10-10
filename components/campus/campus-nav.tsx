import Link from "next/link";

const links = [
  { href: "/campus", label: "Campus Faith" },
  { href: "/campus/organizations", label: "Campus Ministries" },
  { href: "/campus/churches", label: "Student-Friendly Churches" },
  { href: "/campus/events", label: "Student Events" },
  { href: "/campus/new-to-champaign-urbana", label: "New to C-U?" },
  { href: "/campus/list-your-organization", label: "List Your Organization" }
];

export function CampusNav({ current }: { current: string }) {
  return (
    <nav aria-label="Campus Faith" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={current === l.href ? "page" : undefined}
              className={`focus-ring inline-flex min-h-[40px] items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${current === l.href ? "bg-brand-900 text-white" : "border border-line bg-white text-stone-700 hover:bg-brand-50"}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ListOrgCallout() {
  return (
    <aside className="flex flex-col items-start gap-4 rounded-[28px] border border-brand-100 bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-2xl text-base font-medium text-brand-900">Lead a Christian student organization or campus ministry? List it free so students can find you.</p>
      <Link href="/campus/list-your-organization" className="focus-ring inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-700">
        List your organization
      </Link>
    </aside>
  );
}
