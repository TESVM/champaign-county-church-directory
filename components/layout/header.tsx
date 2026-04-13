import Link from "next/link";
import { Church, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { musicianDirectoryUrl } from "@/lib/utils";

const nav = [
  { href: "/directory", label: "Directory" },
  { href: "/cities", label: "Browse by City" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-2xl focus-ring">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 via-brand-500 to-rose text-white shadow-card">
            <Church className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-xl text-ink">Champaign County Church Directory</p>
            <p className="text-sm text-stone-600">Find churches across Champaign County, Illinois</p>
          </div>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 xl:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-stone-700 hover:text-brand-900 focus-ring">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="ghost">
            <a href={musicianDirectoryUrl("/")} target="_blank" rel="noreferrer">
              <Music2 className="mr-2 h-4 w-4" />
              Find Musicians
            </a>
          </Button>
          <Button asChild>
            <Link href="/submit">Submit a Church</Link>
          </Button>
        </div>

        <details className="md:hidden">
          <summary className="focus-ring cursor-pointer list-none rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">
            Menu
          </summary>
          <div className="absolute right-4 top-[72px] w-[min(22rem,calc(100vw-2rem))] rounded-[24px] border border-line bg-white p-4 shadow-soft">
            <nav aria-label="Mobile primary" className="flex flex-col gap-2">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-2xl px-4 py-3 text-sm font-medium text-stone-700 hover:bg-brand-50 focus-ring">
                  {item.label}
                </Link>
              ))}
              <a
                href={musicianDirectoryUrl("/")}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl px-4 py-3 text-sm font-medium text-stone-700 hover:bg-brand-50 focus-ring"
              >
                Find Musicians
              </a>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
