import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { SectionHeading } from "@/components/layout/section-heading";
import { Card } from "@/components/ui/card";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact",
  description: "Corrections, listing questions, and feedback for the Champaign County Church Directory.",
  alternates: { canonical: "/contact" }
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
      <div>
        <SectionHeading as="h1" eyebrow="Contact" title="Questions, corrections, or feedback" description="Messages are saved for the directory team and answered by email." />
        <div className="mt-8 space-y-4">
          {env.supportEmail ? (
            <Card className="rounded-[24px] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Email</p>
              <a className="mt-2 block text-stone-700 underline" href={`mailto:${env.supportEmail}`}>{env.supportEmail}</a>
            </Card>
          ) : null}
          <Card className="rounded-[24px] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Coverage</p>
            <p className="mt-2 text-stone-700">Champaign County, Illinois</p>
          </Card>
          <Card className="rounded-[24px] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Fixing a listing?</p>
            <p className="mt-2 text-stone-700">Use “Report outdated information” on the church’s page so the report is attached to the right listing.</p>
          </Card>
        </div>
      </div>
      <Card className="rounded-[32px] p-6 sm:p-8">
        <ContactForm />
      </Card>
    </div>
  );
}
