import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card } from "@/components/ui/card";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Accessibility",
  description: "Champaign County Churches aims to meet WCAG 2.2 Level AA. How the site supports accessibility, and how to report a barrier.",
  alternates: { canonical: "/accessibility" }
};

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading as="h1" eyebrow="Accessibility" title="Accessibility statement" description="Everyone should be able to find a church, whatever device or assistive technology they use." />
      <Card className="mt-8 space-y-6 p-6 text-sm leading-7 text-stone-700 sm:p-8">
        <section>
          <h2 className="font-display text-2xl text-ink">Our standard</h2>
          <p>
            We aim to meet the{" "}
            <a href="https://www.w3.org/TR/WCAG22/" className="underline" target="_blank" rel="noopener noreferrer">
              Web Content Accessibility Guidelines (WCAG) 2.2, Level AA
            </a>
            , the standard commonly applied under the Americans with Disabilities Act and Section 508. We test pages with automated checks (axe-core) and by hand, including keyboard-only use and colour contrast.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">What the site does</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Every page works with a keyboard, shows where focus is, and has a “Skip to main content” link.</li>
            <li>Text and controls meet AA colour contrast, and buttons and links are at least 44 by 44 pixels on touch screens.</li>
            <li>Pages have one main heading and a logical heading order, and form fields have visible labels.</li>
            <li>Form errors say what went wrong and link to the field that needs attention.</li>
            <li>Photos have text descriptions; church photos that are not yet provided are labelled as such.</li>
            <li>The map has a list view with the same information, and sharing your location for “Near me” is optional.</li>
            <li>Pages zoom to 400% and reflow on small screens, and animation is reduced when your device asks for it.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Known limits</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Event flyers and some photos are supplied by churches. We ask churches to put event details in text as well, but a flyer image may contain text a screen reader cannot read.</li>
            <li>Links to church websites, livestreams, and apps go to sites we do not control.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Report a barrier</h2>
          <p>
            If something on the site is hard to use, please tell us what page and what happened, and we will fix it or get you the information another way.{" "}
            <Link href="/contact" className="underline">
              Send us a message
            </Link>
            {env.supportEmail ? (
              <>
                {" "}
                or email{" "}
                <a href={`mailto:${env.supportEmail}`} className="underline">
                  {env.supportEmail}
                </a>
              </>
            ) : null}
            .
          </p>
        </section>
        <p className="text-xs text-stone-500">Last reviewed October 2026.</p>
      </Card>
    </div>
  );
}
