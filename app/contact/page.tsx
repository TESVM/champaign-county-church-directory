import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/components/forms/contact-form";
import { SectionHeading } from "@/components/layout/section-heading";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Corrections, listing questions, and partnership enquiries for the Champaign County Church Directory.",
  alternates: { canonical: absoluteUrl("/contact") }
};

const details = [
  ["Email", "admin@champaignchurchdirectory.com"],
  ["Coverage", "Champaign County, Illinois"],
  ["Response window", "Typically within one business day"]
] as const;

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div>
        {/* The page's own h1; SectionHeading renders an h2 by default. */}
        <SectionHeading
          as="h1"
          eyebrow="Contact"
          title="Corrections, listing questions, or partnership enquiries"
          description="Use this form for church listing updates, claim questions, or directory feedback."
        />
        <div className="mt-8 space-y-4">
          {details.map(([label, value]) => (
            <Card key={label} className="rounded-[24px] bg-white/85 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
                {label}
              </p>
              <p className="mt-2 text-stone-700">{value}</p>
            </Card>
          ))}
        </div>
      </div>

      {/*
        This page previously hand-rolled a form with no action attribute, so the
        submit button reloaded the page and discarded the message. It now uses
        the shared ContactForm, which posts to the server action.
      */}
      <Card className="rounded-[32px] bg-white/90 p-6 sm:p-8">
        <ContactForm />
      </Card>
    </div>
  );
}
