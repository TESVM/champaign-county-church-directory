import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How the Champaign County Church Directory website and mobile apps handle information, and how to request removal of a listing.",
  alternates: {
    canonical: absoluteUrl("/privacy")
  }
};

/**
 * Required by both the App Store and Google Play, which each need a publicly
 * reachable privacy policy URL before a submission is accepted.
 *
 * The content describes what the software actually does today. It must be kept
 * in step with the code: if the mobile app ever transmits location, or an
 * analytics SDK is added, this page and the store data-safety declarations have
 * to change in the same commit.
 */

const LAST_UPDATED = "July 27, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-stone-700 [&_li]:leading-7 [&_p]:leading-7">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl text-ink sm:text-5xl">Privacy Policy</h1>
      <p className="mt-4 text-stone-600">Last updated {LAST_UPDATED}</p>

      <Card className="mt-8 bg-white/85 p-6 sm:p-8">
        <p className="leading-7 text-stone-700">
          This policy covers the Champaign County Church Directory website and the
          companion iOS and Android apps. It describes what the software actually
          does today rather than what it might do later.
        </p>

        <Section title="The short version">
          <ul className="list-disc space-y-2 pl-5">
            <li>The mobile apps do not require an account and do not collect personal information.</li>
            <li>
              If you use “Near me”, your location is read on your device to sort
              the list. It is never sent to our servers and never stored.
            </li>
            <li>Churches you save are stored only on your device.</li>
            <li>There is no advertising, no tracking, and no third-party analytics.</li>
            <li>
              Church listings contain publicly available organizational
              information. Any church can ask us to correct or remove its listing.
            </li>
          </ul>
        </Section>

        <Section title="Information the mobile apps handle">
          <p>
            <strong className="text-ink">Location.</strong> If you tap “Use my
            location”, the app asks the operating system for your approximate
            position and uses it to order churches by distance. The calculation
            happens on your device. The coordinates are not transmitted to us, not
            written to storage, and are discarded when you close the app. You can
            refuse the permission and still use every other part of the app.
          </p>
          <p>
            <strong className="text-ink">Saved churches.</strong> Saving a church
            writes its details to your device so the list works offline. It is not
            synced to any server and we cannot see it. Removing the app deletes it.
          </p>
          <p>
            <strong className="text-ink">No account.</strong> The apps have no
            sign-in, so we hold no name, email address, or profile for app users.
          </p>
        </Section>

        <Section title="Information the website handles">
          <p>
            <strong className="text-ink">Forms.</strong> If you submit a listing,
            claim a church, or contact us, we receive what you type, including your
            name and email address, so we can review the request and reply. We use
            it for that purpose only and do not sell or share it.
          </p>
          <p>
            <strong className="text-ink">Administrator sign-in.</strong> Directory
            administrators sign in with credentials we issue. Sessions use a signed
            cookie that expires after seven days.
          </p>
          <p>
            <strong className="text-ink">Server logs.</strong> Our hosting provider
            records standard request logs, including IP address and user agent, for
            security and reliability. These rotate automatically.
          </p>
        </Section>

        <Section title="Church listing information">
          <p>
            Listings describe organizations and contain information churches
            publish about themselves: name, address, phone number, public office
            email, service times, ministries, website, and the name and title of
            pastoral leadership. We compile it from official church websites and
            other public sources.
          </p>
          <p>
            Naming clergy means a listing can contain information about an
            identifiable person. If you are named in a listing and want that
            changed or removed, use the contact route below and we will act on it.
          </p>
        </Section>

        <Section title="Correcting or removing a listing">
          <p>
            Any church, or anyone named in a listing, can ask us to correct or
            remove it. We do not require you to prove authorization to request a{" "}
            <em>removal</em>; we do verify authorization before granting anyone
            ongoing edit access.
          </p>
          <p>
            Email{" "}
            <a
              className="font-semibold text-brand-700 underline underline-offset-2"
              href="mailto:admin@champaignchurchdirectory.com"
            >
              admin@champaignchurchdirectory.com
            </a>{" "}
            or use the{" "}
            <Link
              className="font-semibold text-brand-700 underline underline-offset-2"
              href="/contact"
            >
              contact form
            </Link>
            . Tell us the church name and what is wrong. We aim to respond within
            five business days.
          </p>
        </Section>

        <Section title="Children">
          <p>
            The directory is intended for a general audience and is not directed at
            children. We do not knowingly collect information from children.
          </p>
        </Section>

        <Section title="Third parties">
          <p>
            Opening a church’s website, app, livestream, or social profile hands you
            off to a service we do not control, with its own privacy practices.
            Choosing “Directions” opens your device’s maps application. Church logos
            and photos may be served from the church’s own hosting provider.
          </p>
          <p>
            We do not embed advertising or analytics software in the mobile apps.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes we will update the date above. Material changes
            affecting how information is handled will be noted on this page.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy:{" "}
            <a
              className="font-semibold text-brand-700 underline underline-offset-2"
              href="mailto:admin@champaignchurchdirectory.com"
            >
              admin@champaignchurchdirectory.com
            </a>
          </p>
        </Section>
      </Card>

      <p className="mt-8 text-sm leading-6 text-stone-600">
        This policy describes current practice and is not legal advice. Have it
        reviewed by a qualified advisor before relying on it for compliance in any
        particular jurisdiction.
      </p>
    </div>
  );
}
