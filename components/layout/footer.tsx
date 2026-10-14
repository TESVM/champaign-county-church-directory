import Image from "next/image";
import Link from "next/link";
import { env } from "@/lib/env";
import { musicianDirectoryUrl } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-brand-900 text-brand-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr] lg:px-8">
        <div>
          <div className="mb-5 inline-block rounded-2xl bg-white px-4 py-3">
            <Image src="/brand/logo.png" alt="Champaign County Churches" width={465} height={128} className="h-12 w-auto" />
          </div>
          <h2 className="font-display text-3xl">Helping people find churches with confidence.</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-brand-100">
            Built for residents, families, students, seniors, and visitors looking for a church home in Champaign County.
            Listings show when they were last checked and by whom.
          </p>
        </div>
        <nav aria-label="Footer: explore">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">Explore</p>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <Link href="/directory">Directory</Link>
            <Link href="/map">Explore the map</Link>
            <Link href="/find-a-service">Find a service</Link>
            <Link href="/live">Worship Live &amp; Next</Link>
            <Link href="/campus">Campus Faith</Link>
            <Link href="/events">Events calendar</Link>
            <Link href="/resources">Community help</Link>
            <Link href="/cities">Browse cities</Link>
            <Link href="/denominations">Browse by denomination</Link>
          </div>
        </nav>
        <nav aria-label="Footer: churches">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">For churches</p>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <Link href="/for-churches">Free and enhanced listings</Link>
            <Link href="/claim">Manage your listing</Link>
            <Link href="/collaborate">Collaboration Board</Link>
            <Link href="/submit">Submit a church</Link>
            <Link href="/login">Church sign in</Link>
          </div>
        </nav>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">Contact</p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-brand-100">
            {env.supportEmail ? <a href={`mailto:${env.supportEmail}`}>{env.supportEmail}</a> : null}
            <Link href="/contact">Send a message</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Subscription terms</Link>
            <a href={musicianDirectoryUrl("/")} target="_blank" rel="noreferrer">
              Find musicians
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
