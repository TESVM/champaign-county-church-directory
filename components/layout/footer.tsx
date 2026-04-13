import Link from "next/link";
import { musicianDirectoryUrl } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-brand-900 text-brand-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_0.7fr_0.7fr] lg:px-8">
        <div>
          <h2 className="font-display text-3xl">Helping people find churches with confidence.</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-brand-100">
            Built for residents, families, students, seniors, and visitors looking for a church home in Champaign County.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">Explore</p>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <Link href="/directory">Directory</Link>
            <Link href="/cities">Browse Cities</Link>
            <Link href="/submit">Submit Listing</Link>
            <Link href="/claim">Claim Listing</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">Contact</p>
          <div className="mt-4 space-y-2 text-sm text-brand-100">
            <p>admin@champaignchurchdirectory.com</p>
            <p>Champaign-Urbana, Illinois</p>
            <Link href="/contact">Send a message</Link>
            <a href={musicianDirectoryUrl("/")} target="_blank" rel="noreferrer">
              Find Musicians
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
