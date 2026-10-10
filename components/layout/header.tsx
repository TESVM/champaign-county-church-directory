import Link from "next/link";
import { Church, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActor } from "@/lib/auth";
import { musicianDirectoryUrl } from "@/lib/utils";

const nav = [
  { href: "/directory", label: "Directory" },
  { href: "/map", label: "Explore the Map" },
  { href: "/campus", label: "Campus Faith" },
  { href: "/live", label: "Live & Next" },
  { href: "/find-a-service", label: "Find a Service" },
  { href: "/events", label: "Events" },
  { href: "/resources", label: "Community Help" },
  { href: "/saved", label: "Saved" }
];
const mobileOnly = [
  { href: "/collaborate", label: "Collaboration Board" },
  { href: "/cities", label: "Cities" }
];

export async function Header() {
  const actor = await getActor();
  const signedIn = actor.kind === "user";
  const account = signedIn
    ? { href: actor.staffRole ? "/admin" : "/dashboard", label: actor.staffRole ? "Admin" : "My church" }
    : { href: "/login", label: "Church sign in" };

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl focus-ring">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 via-brand-500 to-rose text-white shadow-card">
            <Church className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg text-ink sm:text-xl">Champaign County Church Directory</p>
            <p className="hidden text-sm text-stone-600 sm:block xl:hidden 2xl:block">Find churches across Champaign County, Illinois</p>
          </div>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-4 xl:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap text-sm font-medium text-stone-700 hover:text-brand-900 focus-ring">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <Button asChild variant="ghost" className="whitespace-nowrap">
            <Link href="/for-churches">For churches</Link>
          </Button>
          <Button asChild variant="secondary" className="whitespace-nowrap">
            <Link href={account.href}>{account.label}</Link>
          </Button>
        </div>

        <details className="xl:hidden">
          <summary className="focus-ring flex min-h-[44px] cursor-pointer list-none items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink">
            Menu
          </summary>
          <div className="absolute right-4 top-[68px] max-h-[80vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-[24px] border border-line bg-white p-4 shadow-soft">
            <nav aria-label="Mobile primary" className="flex flex-col gap-1">
              {[...nav, ...mobileOnly, { href: "/for-churches", label: "For churches" }, account, { href: "/submit", label: "Submit a church" }].map((item) => (
                <Link key={item.href + item.label} href={item.href} className="rounded-2xl px-4 py-3 text-sm font-medium text-stone-700 hover:bg-brand-50 focus-ring">
                  {item.label}
                </Link>
              ))}
              <a href={musicianDirectoryUrl("/")} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-stone-700 hover:bg-brand-50 focus-ring">
                <Music2 className="h-4 w-4" aria-hidden="true" /> Find musicians
              </a>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
