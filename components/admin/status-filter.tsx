import Link from "next/link";

export function StatusFilter({ base, current, options }: { base: string; current: string; options: Array<[string, string]> }) {
  return (
    <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
      {options.map(([value, label]) => (
        <Link
          key={value}
          href={`${base}?status=${value}`}
          aria-current={current === value ? "page" : undefined}
          className={`inline-flex min-h-[40px] items-center rounded-full px-4 text-sm font-semibold focus-ring ${current === value ? "bg-brand-900 text-white" : "bg-white ring-1 ring-line"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
